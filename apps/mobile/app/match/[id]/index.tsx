// apps/mobile/app/match/[id]/index.tsx — Plan 8 Phase E5.
//
// Match detail screen — opens for an existing match. Shows the two players
// (you + opponent), match meta (category, format, when, court), status
// banner (confirmed / pending), and two CTAs:
//   • primary  → live score entry (`/match/[id]/score`)
//   • ghost    → dispute form     (`/match/[id]/dispute`)
//
// Mocked data for now; the real fetch lands in a later polish task
// (`useMatchDetail(id)`).

import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { FormatChip } from '../../../components/ui/FormatChip';
import { colors } from '../../../theme/colors';

// TODO(plan-8-E-polish): replace with useMatchDetail(id)
const MOCK_MATCH = {
  id: 'mock',
  opponent: 'Berk Aydın',
  format: 'klasik' as const,
  category: 'Erkek Tek',
  kind: 'ranking' as const,
  date: 'Bugün',
  time: '18:30',
  court: 'Kort 1',
  status: 'confirmed' as 'confirmed' | 'pending' | 'completed',
};

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const m = MOCK_MATCH;
  const isConfirmed = m.status === 'confirmed';

  const rows: Array<{ label: string; value?: string; valueNode?: ReactNode }> = [
    { label: 'Kategori', value: m.category },
    { label: 'Format', valueNode: <FormatChip fmtKey={m.format} /> },
    { label: 'Tarih', value: `${m.date} · ${m.time}` },
    { label: 'Kort', value: m.court },
  ];

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Maç" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 18 }}>
        {/* Players row */}
        <View
          className="flex-row items-center justify-center"
          style={{ gap: 18, paddingVertical: 8 }}
        >
          <View style={{ alignItems: 'center' }}>
            <Avatar name="Sen" size={64} />
            <Text
              className="font-sans font-bold text-text"
              style={{ fontSize: 13.5, marginTop: 8 }}
            >
              Sen
            </Text>
          </View>
          <Text
            className="font-num font-extrabold text-text-3"
            style={{ fontSize: 16 }}
          >
            VS
          </Text>
          <View style={{ alignItems: 'center' }}>
            <Avatar name={m.opponent} size={64} />
            <Text
              className="font-sans font-bold text-text"
              style={{ fontSize: 13.5, marginTop: 8 }}
            >
              {m.opponent.split(' ')[0]}
            </Text>
          </View>
        </View>

        {/* Meta card */}
        <View
          className="rounded-lg overflow-hidden"
          style={{
            borderWidth: 1,
            borderColor: colors.borderStrong,
            backgroundColor: colors.surface,
          }}
        >
          {rows.map((r, i) => (
            <Row
              key={r.label}
              label={r.label}
              value={r.value}
              valueNode={r.valueNode}
              first={i === 0}
            />
          ))}
        </View>

        {/* Status banner */}
        <View
          className="flex-row items-center rounded-md"
          style={{
            padding: 12,
            gap: 10,
            backgroundColor: isConfirmed ? colors.limeSoft : colors.warnSoft,
          }}
        >
          <Icon
            name={isConfirmed ? 'check' : 'clock'}
            size={18}
            color={isConfirmed ? colors.win : colors.warn}
            stroke={3}
          />
          <Text
            className="font-sans font-bold"
            style={{
              flex: 1,
              fontSize: 13.5,
              color: isConfirmed ? colors.win : colors.warn,
            }}
          >
            {isConfirmed
              ? 'Maç onaylı, sahaya hazırsın'
              : 'Karşı taraf henüz onaylamadı'}
          </Text>
        </View>
      </ScrollView>

      <View style={{ padding: 18, gap: 8 }}>
        <Button
          full
          size="lg"
          icon={<Icon name="spark" size={17} color={colors.onLime} />}
          onPress={() => router.push(`/match/${id}/score` as never)}
        >
          Skoru gir
        </Button>
        <Button
          full
          size="md"
          variant="ghost"
          onPress={() => router.push(`/match/${id}/dispute` as never)}
        >
          İtiraz et
        </Button>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  valueNode,
  first,
}: {
  label: string;
  value?: string;
  valueNode?: ReactNode;
  first?: boolean;
}) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={{
        padding: 14,
        paddingHorizontal: 16,
        borderTopWidth: first ? 0 : 1,
        borderColor: colors.surface3,
      }}
    >
      <Text
        className="font-sans font-semibold text-text-3"
        style={{ fontSize: 14 }}
      >
        {label}
      </Text>
      {valueNode ?? (
        <Text
          className="font-sans font-bold text-text"
          style={{ fontSize: 14 }}
        >
          {value}
        </Text>
      )}
    </View>
  );
}
