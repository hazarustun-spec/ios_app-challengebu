import { useMutation } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';
import type { OnboardingDraft } from '../stores/onboarding-store';

interface Args {
  draft: OnboardingDraft;
}

export function useSubmitOnboarding() {
  return useMutation({
    mutationFn: async ({ draft }: Args) => {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Not signed in');

      // 1. Upload avatar if present
      let avatarUrl: string | null = null;
      if (draft.avatarUri) {
        const ext = draft.avatarUri.split('.').pop() ?? 'jpg';
        const path = `${user.id}/${Date.now()}.${ext}`;
        try {
          const fileData = await FileSystem.readAsStringAsync(draft.avatarUri, {
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
        pronoun: draft.pronoun!,
        pronoun_custom: draft.pronounCustom ?? null,
        gender_category: draft.genderCategory!,
        department_id: draft.departmentId!,
        class_year: draft.classYear!,
        show_department: draft.showDepartment,
        show_class_year: draft.showClassYear,
        skill_self_assessment: draft.skillSelfAssessment!,
        dominant_hand: draft.dominantHand!,
        availability_windows: draft.availabilityWindows,
        avatar_url: avatarUrl,
      });
      if (profileErr) throw profileErr;

      // 3. Seed ELO ratings (1200) for relevant categories
      const categories = pickCategories(draft.genderCategory!);
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

function pickCategories(genderCategory: 'erkek' | 'kadin' | 'open_only'): string[] {
  if (genderCategory === 'erkek') {
    return ['erkek_tek', 'open_tek', 'erkek_cift', 'karma_cift', 'open_cift'];
  }
  if (genderCategory === 'kadin') {
    return ['kadin_tek', 'open_tek', 'kadin_cift', 'karma_cift', 'open_cift'];
  }
  return ['open_tek', 'open_cift'];
}
