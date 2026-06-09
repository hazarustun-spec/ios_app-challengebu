import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}

interface Raw {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  actor: { first_name: string; last_name: string } | null;
}

// `audit_log` SELECT is admin-only via RLS. Joining `profiles` here for the
// actor's display name relies on profiles SELECT being open to authenticated
// users (migration 20260606000001_profiles.sql) — first_name/last_name are
// not column-revoked, so the embed works without a SECURITY DEFINER RPC.
export function useAuditLog(limit = 20) {
  return useQuery<AuditLogRow[]>({
    queryKey: queryKeys.admin.auditLog(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select(
          `id, actor_id, action, entity_type, entity_id, created_at,
           actor:profiles!audit_log_actor_id_fkey(first_name, last_name)`,
        )
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data ?? []) as unknown as Raw[]).map((r) => ({
        id: r.id,
        actor_id: r.actor_id,
        actor_name: r.actor ? `${r.actor.first_name} ${r.actor.last_name}` : null,
        action: r.action,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        created_at: r.created_at,
      }));
    },
  });
}
