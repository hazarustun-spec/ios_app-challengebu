import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface PublishAnnouncementInput {
  title: string;
  body: string;
  targetFilter?: { genderCategory?: 'erkek' | 'kadin' | 'open_only'; onlyActive?: boolean };
  sendPush?: boolean;
}

export interface PublishAnnouncementResult {
  announcementId: string;
  recipientCount: number;
  pushed: number;
}

export function usePublishAnnouncement() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.session?.access_token);
  return useMutation<PublishAnnouncementResult, Error, PublishAnnouncementInput>({
    mutationFn: async (input: PublishAnnouncementInput) => {
      if (!accessToken) throw new Error('not authenticated');
      return invokeFunction<PublishAnnouncementResult>(
        'publish-announcement',
        input,
        accessToken,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.announcements.all });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
