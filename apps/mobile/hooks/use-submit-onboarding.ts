import { useMutation } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';
import { SLOT_TO_DB } from '../lib/availability';
import { useAuthStore } from '../stores/auth-store';
import { captureException } from '../lib/sentry';
import type { OnboardingState } from '../stores/onboarding-store';

type DraftSnapshot = Omit<OnboardingState, 'setField' | 'reset'>;

interface Args {
  draft: DraftSnapshot;
}

/**
 * The onboarding wizard stores the phone as bare digits ("5XX XXX XX XX",
 * see (onboarding)/phone.tsx). The server's phoneSchema wants E.164
 * ("+90XXXXXXXXXX"), so glue the country prefix on before insert. Anything
 * that doesn't look like a 10-digit Turkish mobile is dropped rather than
 * sent as an invalid string — the field is optional server-side.
 */
function toE164TR(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 10) return null;
  return `+90${digits}`;
}

export function useSubmitOnboarding() {
  return useMutation({
    mutationFn: async ({ draft }: Args) => {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Not signed in');

      // 1. Upload avatar if present. Mirrors use-upload-avatar.ts so both
      //    paths behave the same:
      //      - resize + JPEG-compress locally so the base64 blob is tiny
      //        (avoids OOM on older phones with big HEIC captures)
      //      - contentType is always image/jpeg (was `image/${ext}` which
      //        produced invalid MIMEs like `image/HEIC` or query-tainted
      //        `image/jpg?…`)
      //      - upsert:true so re-onboarding after account deletion overwrites
      //        instead of silently failing on duplicate
      //      - errors go to Sentry instead of being swallowed by try/catch;
      //        we still don't throw (avatar is optional) but the developer
      //        finds out if uploads are broken in the wild.
      let avatarUrl: string | null = null;
      if (draft.photoUri) {
        try {
          const normalized = await ImageManipulator.manipulateAsync(
            draft.photoUri,
            [{ resize: { width: 512 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
          );
          const fileData = await FileSystem.readAsStringAsync(normalized.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const buffer = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));
          const fileName = `${user.id}.jpg`;
          const { error: upErr } = await supabase.storage
            .from('avatars')
            .upload(fileName, buffer, {
              contentType: 'image/jpeg',
              upsert: true,
            });
          if (upErr) {
            captureException(upErr, { where: 'useSubmitOnboarding.avatarUpload' });
          } else {
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);
            avatarUrl = urlData.publicUrl;
          }
        } catch (err) {
          // Avatar is optional — don't block onboarding, but surface the
          // failure so we can spot systemic breakage.
          captureException(err, { where: 'useSubmitOnboarding.avatarUpload' });
        }
      }

      // 2. Create the profile. Insert first (a brand-new account has no row).
      //    If a row already exists (a prior partial attempt, or a pre-seeded
      //    account such as the App Review account) the insert fails with a
      //    unique_violation (23505) on the user_id primary key; fall back to an
      //    update so onboarding is idempotent.
      //
      //    Why not `.upsert()`: upsert's conflict path issues an UPDATE that
      //    SETs every column in the payload, including `email` — but
      //    `authenticated` has UPDATE on (role, status, email, kvkk_accepted_at)
      //    revoked (20260619000001_security_hardening.sql). Updating those is
      //    forbidden, so the update path must omit `email`. `email` is still
      //    sent on the insert path (INSERT is allowed and the column is NOT
      //    NULL); it never changes after creation anyway.
      const insertPayload = {
        user_id: user.id,
        email: user.email,
        first_name: draft.firstName,
        last_name: draft.lastName,
        phone: toE164TR(draft.phone),
        pronoun: draft.pronoun,
        // No screen collects a custom pronoun — the wizard's "other" option is
        // "belirtmek istemiyorum". Sent explicitly so the UPDATE branch below
        // (re-onboarding after account deletion, or the pre-seeded review
        // account) clears whatever the previous profile left here instead of
        // pairing a new pronoun with a stale string.
        pronoun_custom: null,
        gender_category: draft.category,
        department_id: draft.departmentId,
        class_year: draft.classYear,
        show_department: draft.showDepartment,
        show_class_year: draft.showClassYear,
        skill_self_assessment: draft.level,
        dominant_hand: draft.hand,
        availability_windows: draft.availability.map((s) => SLOT_TO_DB[s]),
        avatar_url: avatarUrl,
      };

      const { error: insertErr } = await supabase.from('profiles').insert(insertPayload);
      if (insertErr) {
        if (insertErr.code !== '23505') throw insertErr;
        // Row already exists — update the same row, minus the columns the
        // client is not allowed to change (user_id is the key; email is revoked).
        const { user_id: _uid, email: _email, ...updatable } = insertPayload;
        const { error: updateErr } = await supabase
          .from('profiles')
          .update(updatable)
          .eq('user_id', user.id);
        if (updateErr) throw updateErr;
      }

      // ELO ratings (1200, per eligible category) are seeded server-side by
      // the trg_seed_elo_ratings trigger on profiles insert — elo_ratings RLS
      // doesn't allow the client to write these directly.

      return { profileCreated: true };
    },
  });
}
