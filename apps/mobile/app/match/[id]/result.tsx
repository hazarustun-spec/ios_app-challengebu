// apps/mobile/app/match/[id]/result.tsx — Plan 8 Phase E8.
//
// Match summary screen. Renders the win/loss/void tag, the avatars +
// final score, and (for non-void matches) an ELO delta card with a
// CountUp animation interpolating from the player's current ELO to
// `current + delta`.
//
// Search params (passed from the score screen via `router.replace`):
//   • win    — 'true' | 'false'
//   • score  — e.g. '4-2'
//   • voided — 'true' | 'false'
//   • opp    — opponent display name

import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { colors } from '../../../theme/colors';

// TODO(plan-8-E-polish): pull from profile / useMe()
const ME_ELO = 1487;

export default function MatchResult() {
  const { id, win, score, voided, opp } = useLocalSearchParams<{
    id: string;
    win?: string;
    score?: string;
    voided?: string;
    opp?: string;
  }>();

  const isWin = win === 'true';
  const isVoid = voided === 'true';
  const opponent = opp ?? 'Berk Aydın';
  const finalScore = score ?? '4-2';
  const delta = isVoid ? 0 : isWin ? 22 : -16;

  // Simple CountUp — interpolate from current ELO to current + delta over
  // ~600ms using 20 steps. Skipped on voided matches (delta=0, no anim).
  const [currentElo, setCurrentElo] = useState(ME_ELO);
  useEffect(() => {
    if (isVoid) return;
    const target = ME_ELO + delta;
    const steps = 20;
    const inc = (target - ME_ELO) / steps;
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setCurrentElo(Math.round(ME_ELO + inc * i));
      if (i >= steps) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [delta, isVoid]);

  const tagColor = isVoid ? colors.warn : isWin ? colors.win : colors.loss;
  const tagBg = isVoid ? colors.warnSoft : isWin ? colors.limeSoft : '#FCE6E4';
  const tagText = isVoid
    ? 'Berabere (voided)'
    : isWin
      ? 'Kazandın!'
      : 'Kaybettin';
  const tagIcon: IconName = isVoid ? 'info' : isWin ? 'trophy' : 'x';

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Maç Sonucu"
        close
        onBack={() => router.replace('/(tabs)/matches' as never)}
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 16, paddingVertical: 12 }}>
          <View
            className="flex-row items-center rounded-pill"
            style={{
              paddingHorizontal: 16,
              paddingVertical: 7,
              gap: 6,
              backgroundColor: tagBg,
            }}
          >
            <Icon name={tagIcon} size={16} color={tagColor} stroke={2.5} />
            <Text
              className="font-sans font-extrabold"
              style={{ fontSize: 14, color: tagColor }}
            >
              {tagText}
            </Text>
          </View>

          <View
            className="flex-row items-center justify-center"
            style={{ gap: 16 }}
          >
            <Avatar
              name="Sen"
              size={58}
              ring={isWin && !isVoid ? colors.win : undefined}
            />
            <Text
              className="font-num font-extrabold text-text"
              style={{ fontSize: 40, letterSpacing: -1.2 }}
            >
              {finalScore}
            </Text>
            <Avatar
              name={opponent}
              size={58}
              ring={!isWin && !isVoid ? colors.win : undefined}
            />
          </View>
          <Text
            className="font-sans font-semibold text-text-3"
            style={{ fontSize: 13 }}
          >
            BÜ Klasik · Bugün
          </Text>
        </View>

        {!isVoid && (
          <View
            className="bg-surface rounded-lg"
            style={{ padding: 18, borderWidth: 1, borderColor: colors.borderStrong }}
          >
            <Text
              className="font-sans font-bold text-text-3"
              style={{ fontSize: 12.5 }}
            >
              Tahmini ELO değişimi
            </Text>
            <View
              className="flex-row items-center"
              style={{ marginTop: 10, gap: 14 }}
            >
              <Text
                className="font-num font-bold text-text-3"
                style={{ fontSize: 26 }}
              >
                {ME_ELO}
              </Text>
              <Icon name="chevR" size={20} color={colors.text3} />
              <Text
                className="font-num font-extrabold"
                style={{
                  fontSize: 30,
                  color: isWin ? colors.win : colors.loss,
                }}
              >
                {currentElo}
              </Text>
              <View
                className="rounded-pill"
                style={{
                  marginLeft: 'auto',
                  paddingHorizontal: 11,
                  paddingVertical: 4,
                  backgroundColor: isWin ? colors.limeSoft : '#FCE6E4',
                }}
              >
                <Text
                  className="font-num font-extrabold"
                  style={{
                    fontSize: 17,
                    color: isWin ? colors.win : colors.loss,
                  }}
                >
                  {delta > 0 ? '+' : ''}
                  {delta}
                </Text>
              </View>
            </View>
            <Text
              className="font-sans text-text-3"
              style={{ fontSize: 12, marginTop: 12, lineHeight: 18 }}
            >
              Çarpan: {finalScore} → {isWin ? '1.1×' : '1.0×'}. Onaylandığında
              kesinleşir.
            </Text>
          </View>
        )}

        {isVoid && (
          <View
            className="flex-row bg-warn-soft rounded-md"
            style={{ padding: 14, gap: 10 }}
          >
            <Icon name="info" size={18} color={colors.warn} />
            <Text
              className="font-sans text-text-2"
              style={{ flex: 1, fontSize: 13, lineHeight: 19 }}
            >
              3-3 berabere — bu maç ELO&apos;yu etkilemez ama
              istatistiklerine işlenir.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={{ padding: 20, flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            size="lg"
            variant="secondary"
            full
            icon={<Icon name="flag" size={17} color={colors.text} />}
            onPress={() => router.push(`/match/${id}/dispute` as never)}
          >
            İtiraz et
          </Button>
        </View>
        <View style={{ flex: 1.5 }}>
          <Button
            size="lg"
            full
            icon={
              <Icon name="check" size={17} color={colors.onLime} stroke={3} />
            }
            onPress={() => {
              router.replace('/(tabs)' as never);
            }}
          >
            Onayla
          </Button>
        </View>
      </View>
    </View>
  );
}
