import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface MyBadgeRow {
  user_badge_id: string;
  badge_id: string;
  code: string;
  name_tr: string;
  description_tr: string;
  icon: string;
  category: string;
  earned_at: string;
  pinned_at: string | null;
  season_id: string | null;
}

export function useUserBadges(targetUserId: string | undefined) {
  return useQuery<MyBadgeRow[]>({
    queryKey: queryKeys.badges.forUser(targetUserId ?? '__none__'),
    queryFn: () => fetchUserBadges(targetUserId),
    enabled: !!targetUserId,
  });
}

// Delegates to useUserBadges so caller and tab share one cache key + one fetch.
export function useMyBadges() {
  const userId = useAuthStore((s) => s.user?.id);
  return useUserBadges(userId);
}

async function fetchUserBadges(userId: string | undefined): Promise<MyBadgeRow[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('user_badges')
    .select(`
      id, badge_id, earned_at, pinned_at, season_id,
      badge:badges(code, name_tr, description_tr, icon, category)
    `)
    .eq('profile_id', userId)
    .order('earned_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawRow[]).map((r) => ({
    user_badge_id: r.id,
    badge_id: r.badge_id,
    earned_at: r.earned_at,
    pinned_at: r.pinned_at,
    season_id: r.season_id,
    code: r.badge?.code ?? '',
    name_tr: r.badge?.name_tr ?? '',
    description_tr: r.badge?.description_tr ?? '',
    icon: r.badge?.icon ?? '🏷️',
    category: r.badge?.category ?? 'milestone',
  }));
}

interface RawRow {
  id: string;
  badge_id: string;
  earned_at: string;
  pinned_at: string | null;
  season_id: string | null;
  badge: {
    code: string;
    name_tr: string;
    description_tr: string;
    icon: string;
    category: string;
  } | null;
}
