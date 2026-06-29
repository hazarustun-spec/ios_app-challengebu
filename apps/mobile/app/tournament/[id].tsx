import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { colors } from '../../theme/colors';
import { BracketView } from '../../components/seasons/BracketView';
import { useTournamentBracket } from '../../hooks/use-tournament-bracket';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useTournamentBracket(id);

  const categoryLabel = data
    ? (CATEGORY_LABELS[data.category] ?? data.category)
    : 'Turnuva';
  const subtitle = data
    ? `${data.bracket_size} oyuncu · ${statusLabel(data.status)}`
    : undefined;

  const header = (
    <NavHeader
      title={categoryLabel}
      subtitle={subtitle}
      onBack={() => router.back()}
    />
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Turnuva" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Turnuva" onBack={() => router.back()} />
        <EmptyState
          icon="trophy"
          title="Turnuva bulunamadı"
          body="Bu turnuva artık mevcut değil veya erişim yetkiniz yok."
        />
      </View>
    );
  }

  const hasUnexpectedSize = data.bracket_size !== 4 && data.bracket_size !== 8;

  return (
    <View className="flex-1 bg-bg">
      {header}
      {hasUnexpectedSize && (
        <View
          className="flex-row mx-4 mt-2 rounded-xl"
          style={{
            padding: 12,
            gap: 8,
            backgroundColor: colors.warnSoft,
            borderWidth: 1,
            borderColor: colors.warn,
          }}
        >
          <Icon name="warn" size={16} color={colors.warn} />
          <Text
            className="font-sans"
            style={{ flex: 1, fontSize: 12, lineHeight: 18, color: colors.text2 }}
          >
            Beklenmedik bracket boyutu ({data.bracket_size}); ham slot listesini
            gösteriyoruz.
          </Text>
        </View>
      )}
      <ScrollView
        horizontal
        contentContainerStyle={{ padding: 16, alignItems: 'center', gap: 18 }}
      >
        <BracketView bracketSize={data.bracket_size} slots={data.slots} />
      </ScrollView>
    </View>
  );
}

function statusLabel(s: string): string {
  if (s === 'seeded') return 'Eşleşmeler hazır';
  if (s === 'in_progress') return 'Devam ediyor';
  return 'Tamamlandı';
}
