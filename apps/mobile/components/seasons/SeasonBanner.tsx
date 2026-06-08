import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { seasonDisplayName } from '@tennis/shared';
import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';
import { useCurrentSeason } from '../../hooks/use-current-season';
import { useUpcomingFinaleStatus } from '../../hooks/use-upcoming-finale-status';
import { useMyRankings } from '../../hooks/use-my-rankings';

export function SeasonBanner() {
  const season = useCurrentSeason();
  const finaleStatus = useUpcomingFinaleStatus();
  const rankings = useMyRankings();
  const [firstTournamentId, setFirstTournamentId] = useState<string | null>(null);

  useEffect(() => {
    if (!season.data) return;
    if (finaleStatus.data !== 'finale_in_progress') return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('tournaments')
        .select('id')
        .eq('season_id', season.data!.id)
        .in('status', ['seeded', 'in_progress'])
        .limit(1)
        .maybeSingle();
      if (!cancelled) setFirstTournamentId(data?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [season.data, finaleStatus.data]);

  if (!season.data) return null;
  const status = finaleStatus.data;
  if (!status || status === 'inactive') return null;

  const label = `${seasonDisplayName(season.data.name)} ${season.data.year}`;
  const top8 = computeTop8Status(rankings.data ?? []);

  if (status === 'announced') {
    return (
      <BannerShell>
        <Text className="text-sm font-semibold text-amber-900">
          🏆 {label} Finali yaklaşıyor
        </Text>
        <Text className="mt-1 text-xs text-amber-800">
          {top8.summary}
        </Text>
      </BannerShell>
    );
  }

  if (status === 'qualifying') {
    return (
      <BannerShell>
        <Text className="text-sm font-semibold text-amber-900">
          🎯 {label} Finali sıralama penceresi
        </Text>
        <Text className="mt-1 text-xs text-amber-800">
          Son maçların Top 8 koltuğunu belirleyebilir.
        </Text>
      </BannerShell>
    );
  }

  if (status === 'finale_in_progress') {
    return (
      // TODO(Faz E): drop the `as never` once app/tournament/[id].tsx lands and typed-routes recognises this path.
      <BannerShell
        onPress={firstTournamentId ? () => router.push(`/tournament/${firstTournamentId}` as never) : undefined}
      >
        <Text className="text-sm font-semibold text-amber-900">
          🏆 {label} Finali devam ediyor
        </Text>
        <Text className="mt-1 text-xs text-amber-800">
          {firstTournamentId ? "Bracket'i görüntülemek için dokun" : 'Bracket hazırlanıyor...'}
        </Text>
      </BannerShell>
    );
  }

  return (
    <BannerShell>
      <Text className="text-sm font-semibold text-amber-900">
        ✅ {label} Finali tamamlandı
      </Text>
      <Text className="mt-1 text-xs text-amber-800">
        Şampiyonlar profilde rozet aldı.
      </Text>
    </BannerShell>
  );
}

function BannerShell({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  const inner = (
    <View className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3">{children}</View>
  );
  if (!onPress) return inner;
  return <Pressable onPress={onPress}>{inner}</Pressable>;
}

function computeTop8Status(
  rankings: { category: string; rating: number; rank: number }[],
): { summary: string } {
  if (rankings.length === 0) {
    return { summary: 'Sıralama almak için sıralama maçı oyna.' };
  }
  const best = rankings.reduce((acc, r) => (r.rank < acc.rank ? r : acc));
  if (best.rank <= 8) {
    return { summary: `Top 8'desin — ${best.category} #${best.rank}` };
  }
  return { summary: `En iyi sıran: ${best.category} #${best.rank}. Top 8 hedefini kovala.` };
}
