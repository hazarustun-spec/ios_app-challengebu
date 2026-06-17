// hooks/use-start-conversation.ts
//
// Provides `useStartConversation()` — a helper hook that calls the
// `get_or_create_conversation` RPC, then navigates to the thread screen.
//
// Usage:
//   const { start } = useStartConversation();
//   start({ requestId: 'abc', otherUserId: 'xyz', name: 'Berk Aydın' });

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

export interface StartConversationInput {
  requestId: string;
  otherUserId: string;
  name: string;
}

export function useStartConversation() {
  const start = useCallback(
    async ({ requestId, otherUserId, name }: StartConversationInput) => {
      try {
        const { data, error } = await supabase.rpc('get_or_create_conversation', {
          p_request_id: requestId,
          p_other_user_id: otherUserId,
        });
        if (error) throw error;
        const conversationId = data as string;
        router.push({
          pathname: '/messages/[conversationId]',
          params: { conversationId, otherUserId, name },
        } as never);
      } catch (err) {
        Alert.alert(
          'Hata',
          err instanceof Error ? err.message : 'Konuşma başlatılamadı.',
        );
      }
    },
    [],
  );

  return { start };
}
