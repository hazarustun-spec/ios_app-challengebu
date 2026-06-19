// Rütbeler — the seven rank medallions (lib/rank-art) in a showcase grid, the
// player's current tier highlighted. Reached from the profile level row.

import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { RankBadge } from '../../components/ui/RankBadge';
import { LEVELS, levelForElo } from '../../lib/levels';
import { useMyRankings } from '../../hooks/use-my-rankings';
import { colors } from '../../theme/colors';

export default function RanksScreen() {
  const rankingsQ = useMyRankings();
  const top = (rankingsQ.data ?? [])
    .slice()
    .sort((a, b) => b.rating - a.rating)[0];
  const meElo = top?.rating ?? 1200;
  const currentKey = levelForElo(meElo).key;

  return (
    <View className="flex-1 bg-bg">
      <NavHeader large title="Rütbeler" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text
          className="font-sans text-text-2"
          style={{ fontSize: 14, lineHeight: 20, marginBottom: 18 }}
        >
          ELO yükseldikçe rütben yükselir — yedi kademe, Çekirge'den Şampiyon'a.
        </Text>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            rowGap: 14,
          }}
        >
          {LEVELS.map((L) => {
            const isCurrent = L.key === currentKey;
            return (
              <View
                key={L.key}
                className={isCurrent ? 'bg-clay-softer' : 'bg-surface-2'}
                style={{
                  width: '47.5%',
                  alignItems: 'center',
                  borderRadius: 18,
                  borderWidth: isCurrent ? 2 : 1,
                  borderColor: isCurrent ? colors.lime : colors.surface3,
                  paddingVertical: 16,
                  paddingHorizontal: 10,
                }}
              >
                <RankBadge level={L.key} size={118} />
                <Text
                  className="font-sans font-bold"
                  style={{ marginTop: 8, fontSize: 16, color: L.color }}
                >
                  {L.name}
                </Text>
                <Text
                  className="font-sans text-text-3"
                  style={{ marginTop: 2, fontSize: 12 }}
                >
                  {L.minElo}+ ELO
                </Text>
                {isCurrent && (
                  <Text
                    className="font-sans font-bold"
                    style={{ marginTop: 6, fontSize: 10.5, color: colors.clayText, letterSpacing: 0.5 }}
                  >
                    ● ŞU ANKİ RÜTBEN
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
