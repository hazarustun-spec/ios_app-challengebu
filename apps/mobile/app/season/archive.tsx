// Past seasons archive — Plan 8 Phase F12, live-wired.
//
// Ports the design bundle's `SeasonArchive` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-season.jsx
// `function SeasonArchive()`) to React Native + NativeWind.
//
// Vertical list of closed seasons with title + date range, champion
// strip, and Yıllık chip when the season's champion also won the annual
// title (yearly_champion badge).
//
// Live data:
//   - useAdminSeasons → all seasons; filtered to status === 'closed'
//   - Inline useQuery → user_badges join profiles + seasons for season_champion
//     and yearly_champion badges (one query for all closed seasons)
//   - Inline useQuery → tournaments table for erkek_tek tournament id per
//     closed season (used to navigate to /tournament/[id] on card tap)

import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { seasonDisplayName } from '@tennis/shared';
import { NavHeader } from '../../components/ui/NavHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { useAdminSeasons } from '../../hooks/use-admin-seasons';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';

const GOLD = '#C9982E';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeasonChampion {
  /** season.id this badge belongs to */
  seasonId: string;
  /** player display name */
  name: string;
  /** badge code: 'season_champion' | 'yearly_champion' */
  badgeCode: string;
}

interface RawBadgeRow {
  season_id: string | null;
  badge: { code: string } | null;
  profile: { first_name: string; last_name: string } | null;
  season: { year: number } | null;
}

// ---------------------------------------------------------------------------
// Inline query — erkek_tek tournament id per season
// ---------------------------------------------------------------------------

/**
 * Returns a map of seasonId → erkek_tek tournament id for the given seasons.
 * Used to wire archive cards to /tournament/[id].
 */
function useSeasonTournamentIds(seasonIds: string[]) {
  return useQuery<Record<string, string>>({
    queryKey: ['season-archive-tournament-ids', ...seasonIds],
    enabled: seasonIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, season_id')
        .in('season_id', seasonIds)
        .eq('category', 'erkek_tek');
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const t of (data ?? []) as { id: string; season_id: string }[]) {
        // keep the first erkek_tek tournament encountered per season
        if (!map[t.season_id]) map[t.season_id] = t.id;
      }
      return map;
    },
    staleTime: 1000 * 60 * 60,
  });
}

// ---------------------------------------------------------------------------
// Inline query — all season + yearly champion badges
// ---------------------------------------------------------------------------

function useSeasonChampions() {
  return useQuery<SeasonChampion[]>({
    queryKey: ['season-archive-champions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          season_id,
          badge:badges!inner(code),
          profile:profiles!user_badges_profile_id_fkey(first_name, last_name),
          season:seasons(year)
        `)
        .in('badge.code', ['season_champion', 'yearly_champion']);
      if (error) throw error;
      const rows = (data ?? []) as unknown as RawBadgeRow[];
      return rows
        .filter((r) => r.season_id !== null && r.badge !== null)
        .map((r) => ({
          seasonId: r.season_id!,
          name: r.profile
            ? `${r.profile.first_name} ${r.profile.last_name}`.trim()
            : 'Bilinmeyen',
          badgeCode: r.badge!.code,
        }));
    },
    staleTime: 1000 * 60 * 60,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateRange(startsAt: string, endsAt: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  return `${fmt(startsAt)} – ${fmt(endsAt)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SeasonArchive() {
  const seasonsQ = useAdminSeasons();
  const championsQ = useSeasonChampions();

  const closedSeasons = (seasonsQ.data ?? [])
    .filter((s) => s.status === 'closed')
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));

  const closedSeasonIds = closedSeasons.map((s) => s.id);
  const tournamentsQ = useSeasonTournamentIds(closedSeasonIds);

  const isLoading = seasonsQ.isLoading || championsQ.isLoading;
  const isError = seasonsQ.isError || championsQ.isError;
  const isRefetching =
    (seasonsQ.isRefetching ?? false) || (championsQ.isRefetching ?? false);

  // Build a lookup: seasonId → champion badge rows
  const champMap = new Map<string, SeasonChampion[]>();
  for (const c of championsQ.data ?? []) {
    const arr = champMap.get(c.seasonId) ?? [];
    arr.push(c);
    champMap.set(c.seasonId, arr);
  }

  // Lookup: seasonId → erkek_tek tournament id (may be undefined for old seasons)
  const tournamentIdMap = tournamentsQ.data ?? {};

  const header = (
    <NavHeader title="Geçmiş Sezonlar" onBack={() => router.back()} />
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center" style={{ gap: 12 }}>
          <Text className="font-sans text-text-3" style={{ fontSize: 14 }}>
            Sezon arşivi yüklenemedi.
          </Text>
          <Pressable
            onPress={() => {
              void seasonsQ.refetch();
              void championsQ.refetch();
              void tournamentsQ.refetch();
            }}
          >
            <Text
              className="font-sans font-bold"
              style={{ fontSize: 14, color: colors.court }}
            >
              Tekrar dene
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (closedSeasons.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <EmptyState
          icon="trophy"
          title="Henüz geçmiş sezon yok"
          body="Tamamlanan sezonlar burada görünecek."
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 18, gap: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void seasonsQ.refetch();
              void championsQ.refetch();
              void tournamentsQ.refetch();
            }}
            tintColor={colors.clay}
          />
        }
      >
        {closedSeasons.map((season) => {
          const badges = champMap.get(season.id) ?? [];
          const seasonBadge = badges.find((b) => b.badgeCode === 'season_champion');
          const yearlyBadge = badges.find((b) => b.badgeCode === 'yearly_champion');
          const champName = seasonBadge?.name ?? yearlyBadge?.name ?? null;
          const isAnnual = yearlyBadge !== undefined;
          const dateRange = formatDateRange(season.starts_at, season.ends_at);
          const seasonTitle = `${seasonDisplayName(season.name)} ${season.year}`;
          const tournamentId = tournamentIdMap[season.id];

          const cardContent = (
            <>
              <View
                className="flex-row items-center justify-between"
                style={{ marginBottom: 12 }}
              >
                <Text
                  className="font-sans font-extrabold text-text"
                  style={{ fontSize: 16 }}
                >
                  {seasonTitle}
                </Text>
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Text
                    className="font-num font-semibold text-text-3"
                    style={{ fontSize: 12 }}
                  >
                    {dateRange}
                  </Text>
                  {tournamentId !== undefined && (
                    <Icon name="arrowRight" size={14} color={colors.text3} />
                  )}
                </View>
              </View>
              <View
                className="flex-row items-center bg-surface-2 rounded-md"
                style={{ padding: 10, paddingHorizontal: 12, gap: 11 }}
              >
                <Icon name="crown" size={20} color={GOLD} />
                <View style={{ flex: 1 }}>
                  <Text
                    className="font-sans font-semibold text-text-3"
                    style={{ fontSize: 11 }}
                  >
                    Şampiyon
                  </Text>
                  <Text
                    className="font-sans font-bold text-text"
                    style={{ fontSize: 14 }}
                  >
                    {champName ?? '—'}
                  </Text>
                </View>
                {isAnnual && (
                  <View
                    className="flex-row items-center rounded-pill"
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      gap: 4,
                      backgroundColor: `${GOLD}1F`,
                    }}
                  >
                    <Icon name="trophy" size={12} color={GOLD} />
                    <Text
                      className="font-sans font-bold"
                      style={{ fontSize: 11, color: GOLD }}
                    >
                      Yıllık
                    </Text>
                  </View>
                )}
              </View>
            </>
          );

          if (tournamentId !== undefined) {
            return (
              <Pressable
                key={season.id}
                className="bg-surface rounded-lg"
                style={({ pressed }) => ({
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  opacity: pressed ? 0.75 : 1,
                })}
                onPress={() => router.push(`/tournament/${tournamentId}`)}
              >
                {cardContent}
              </Pressable>
            );
          }

          return (
            <View
              key={season.id}
              className="bg-surface rounded-lg"
              style={{
                padding: 16,
                borderWidth: 1,
                borderColor: colors.borderStrong,
              }}
            >
              {cardContent}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
