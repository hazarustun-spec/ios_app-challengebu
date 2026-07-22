// hooks/use-submit-feedback.ts — insert a row into public.feedback.
//
// Free-text in-app feedback (Settings → Geri bildirim). RLS lets a user insert
// only their own row (user_id = auth.uid()); the owner reads submissions in the
// Supabase dashboard. app_version + platform are attached for triage.

import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

export type FeedbackCategory = 'bug' | 'idea' | 'general';

export function useSubmitFeedback() {
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: async ({ category, body }: { category: FeedbackCategory; body: string }) => {
      if (!userId) throw new Error('Giriş gerekli.');
      const trimmed = body.trim();
      if (!trimmed) throw new Error('Lütfen bir şeyler yaz.');
      const { error } = await supabase.from('feedback').insert({
        user_id: userId,
        category,
        body: trimmed,
        app_version: Constants.expoConfig?.version ?? null,
        platform: Platform.OS,
      });
      if (error) throw error;
    },
  });
}
