// apps/mobile/app/match/[id]/confirm.tsx — Plan 8 Phase E7.
//
// Opponent approval screen — the OTHER side opens this after the home device
// finishes the score. Big score readout in the middle, info banner explaining
// the flow, and two CTAs (Onayla / İtiraz et).
//
// Mocked confirm action just bounces back to the Matches tab. The real
// mutation lands later (`useConfirmMatch`).

import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { colors } from '../../../theme/colors';

export default function MatchConfirm() {
  const { id, opp, score } = useLocalSearchParams<{
    id: string;
    opp?: string;
    score?: string;
  }>();
  const opponent = opp ?? 'Berk Aydın';
  const s = score ?? '4-2';

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Skor onayı" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 18 }}>
        <View
          className="flex-row items-center justify-center"
          style={{ gap: 18, paddingVertical: 14 }}
        >
          <Avatar name="Sen" size={64} />
          <Text
            className="font-num font-extrabold text-text"
            style={{ fontSize: 40 }}
          >
            {s}
          </Text>
          <Avatar name={opponent} size={64} />
        </View>

        <View
          className="bg-blue-soft rounded-md"
          style={{ padding: 14, flexDirection: 'row', gap: 10 }}
        >
          <Icon name="info" size={18} color={colors.info} />
          <Text
            className="font-sans text-text-2"
            style={{ flex: 1, fontSize: 13, lineHeight: 19 }}
          >
            {opponent} bu skoru girdi. Senin onayın bekliyor. Doğruysa
            &quot;Onayla&quot;, yanlışsa &quot;İtiraz et&quot;.
          </Text>
        </View>
      </ScrollView>

      <View style={{ padding: 18, gap: 8 }}>
        <Button
          full
          size="lg"
          icon={<Icon name="check" size={17} color={colors.onLime} stroke={3} />}
          onPress={() => {
            // TODO(plan-8-E-polish): real confirm mutation
            router.replace('/(tabs)/matches' as never);
          }}
        >
          Onayla
        </Button>
        <Button
          full
          size="md"
          variant="secondary"
          onPress={() => router.push(`/match/${id}/dispute` as never)}
        >
          İtiraz et
        </Button>
      </View>
    </View>
  );
}
