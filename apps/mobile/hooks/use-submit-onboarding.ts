import { useMutation } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { SLOT_TO_DB } from '../lib/availability';
import { useAuthStore } from '../stores/auth-store';
import type { OnboardingState } from '../stores/onboarding-store';

type DraftSnapshot = Omit<OnboardingState, 'setField' | 'reset'>;

interface Args {
  draft: DraftSnapshot;
}


export function useSubmitOnboarding() {
  return useMutation({
    mutationFn: async ({ draft }: Args) => {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Not signed in');

      // 1. Upload avatar if present
      let avatarUrl: string | null = null;
      if (draft.photoUri) {
        const ext = draft.photoUri.split('.').pop() ?? 'jpg';
        const path = `${user.id}.${ext}`;
        try {
          const fileData = await FileSystem.readAsStringAsync(draft.photoUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const buffer = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));
          const { error: upErr } = await supabase.storage.from('avatars').upload(path, buffer, {
            contentType: `image/${ext}`,
          });
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
            avatarUrl = urlData.publicUrl;
          }
        } catch {
          // Silently fail — avatar is optional
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
        phone: draft.phone ?? null,
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
