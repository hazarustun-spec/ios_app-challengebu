// hooks/use-messageable-contacts.ts
//
// Wraps the `list_messageable_contacts` RPC.  Returns every person the current
// user is allowed to message (i.e. they share at least one match_request),
// deduplicated to one row per contact, ordered by most-recent shared request.
//
// Mirrors the style of use-conversations.ts.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface MessageableContact {
  other_user_id: string;
  request_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  last_at: string;
}

export function useMessageableContacts() {
  const myUserId = useAuthStore((s) => s.user?.id);

  return useQuery<MessageableContact[]>({
    queryKey: queryKeys.conversations.contacts(),
    enabled: !!myUserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_messageable_contacts');
      if (error) throw error;
      return (data ?? []) as MessageableContact[];
    },
  });
}
