import { useMutation } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';
import type {
  AvailabilitySlot,
  GenderCategory,
  OnboardingState,
} from '../stores/onboarding-store';

type DraftSnapshot = Omit<OnboardingState, 'setField' | 'reset'>;

interface Args {
  draft: DraftSnapshot;
}

// Map the OBFrame wizard's 6-slot grid (wd_*/we_*) to the canonical
// availability_windows column values (weekday_*/weekend_*).
const SLOT_TO_DB: Record<AvailabilitySlot, string> = {
  wd_am: 'weekday_morning',
  wd_noon: 'weekday_noon',
  wd_eve: 'weekday_evening',
  we_am: 'weekend_morning',
  we_noon: 'weekend_noon',
  we_eve: 'weekend_evening',
};

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

      // 2. Insert profile
      const { error: profileErr } = await supabase.from('profiles').insert({
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
      });
      if (profileErr) throw profileErr;

      // 3. Seed ELO ratings (1200) for relevant categories
      const categories = pickCategories(draft.category);
      const rows = categories.map((c) => ({
        profile_id: user.id,
        category: c,
        rating: 1200,
        matches_played: 0,
      }));
      await supabase.from('elo_ratings').insert(rows);

      return { profileCreated: true };
    },
  });
}

function pickCategories(genderCategory: GenderCategory): string[] {
  if (genderCategory === 'erkek') {
    return ['erkek_tek', 'open_tek', 'erkek_cift', 'karma_cift', 'open_cift'];
  }
  if (genderCategory === 'kadin') {
    return ['kadin_tek', 'open_tek', 'kadin_cift', 'karma_cift', 'open_cift'];
  }
  return ['open_tek', 'open_cift'];
}
