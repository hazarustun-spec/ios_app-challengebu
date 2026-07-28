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

      // 2. Upsert profile. Upsert (not insert) so onboarding is idempotent: a
      // row may already exist from a prior partial attempt or from a pre-seeded
      // account (e.g. the App Review account), and re-submitting must update it
      // rather than fail on the user_id primary-key conflict.
      const { error: profileErr } = await supabase.from('profiles').upsert(
        {
          user_id: user.id,
          email: user.email,
          first_name: draft.firstName,
          last_name: draft.lastName,
          phone: draft.phone ?? null,
          pronoun: draft.pronoun,
          gender_category: draft.category,
          department_id: draft.departmentId,
          class_year: draft.classYear,
          show_department: draft.showDepartment,
          show_class_year: draft.showClassYear,
          skill_self_assessment: draft.level,
          dominant_hand: draft.hand,
          availability_windows: draft.availability.map((s) => SLOT_TO_DB[s]),
          avatar_url: avatarUrl,
        },
        { onConflict: 'user_id' },
      );
      if (profileErr) throw profileErr;

      // ELO ratings (1200, per eligible category) are seeded server-side by
      // the trg_seed_elo_ratings trigger on profiles insert — elo_ratings RLS
      // doesn't allow the client to write these directly.

      return { profileCreated: true };
    },
  });
}
