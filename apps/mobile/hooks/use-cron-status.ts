// Plan 8 Phase G — admin cron status surface.
//
// Wraps the `admin_cron_status(lim integer)` SECURITY DEFINER RPC introduced
// in `20260610000004_admin_extensions.sql`. The RPC fronts a read of
// `cron.job_run_details` joined with `cron.job` and is gated by
// `public.is_admin()` (raises 42501 for non-admins).
//
// Used by the Sistem Sağlığı (admin/health) screen to render the last N cron
// runs as a `[●] name · last-run · OK / UYARI` list. We keep the raw
// `pg_cron` job status strings (`succeeded`, `failed`, `running`, …) on the
// row and let the screen translate them to badge tone — that way the hook
// doesn't lose data the audit subscreen might also need.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export type CronRunStatus = 'succeeded' | 'failed' | 'running' | 'starting' | string;

export interface CronRunRow {
  jobname: string;
  status: CronRunStatus;
  start_time: string;
  end_time: string | null;
  return_message: string | null;
}

export function useCronStatus(limit = 20) {
  return useQuery<CronRunRow[]>({
    queryKey: queryKeys.admin.cronStatus(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_cron_status', {
        lim: limit,
      });
      if (error) throw error;
      return ((data ?? []) as unknown) as CronRunRow[];
    },
    // Cron status drifts in real time; staleTime keeps the network calm but
    // a pull-to-refresh on the health screen will still fetch fresh data.
    staleTime: 1000 * 30,
  });
}
