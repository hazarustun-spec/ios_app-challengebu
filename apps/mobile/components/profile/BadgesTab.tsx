import { Text, View } from 'react-native';
import { useAllBadges, type BadgeCatalogRow } from '../../hooks/use-all-badges';
import { useUserBadges } from '../../hooks/use-my-badges';
import { BadgeCard } from './BadgeCard';

const CATEGORY_LABELS: Record<string, string> = {
  milestone: 'Kilometre Taşları',
  win: 'Galibiyet',
  social: 'Sosyal',
  season: 'Sezon',
  yearly: 'Yıllık',
  fun: 'Eğlenceli',
  loyalty: 'Sadakat',
};

const CATEGORY_ORDER = ['milestone', 'win', 'social', 'season', 'yearly', 'fun', 'loyalty'] as const;

interface Props {
  userId: string;
}

export function BadgesTab({ userId }: Props) {
  const catalog = useAllBadges();
  const owned = useUserBadges(userId);

  if (catalog.isLoading || owned.isLoading) {
    return <Text className="mt-4 text-sm text-gray-500">Yükleniyor...</Text>;
  }

  const earnedIds = new Set((owned.data ?? []).map((b) => b.badge_id));
  const byCategory = new Map<string, BadgeCatalogRow[]>();
  for (const b of catalog.data ?? []) {
    const list = byCategory.get(b.category) ?? [];
    list.push(b);
    byCategory.set(b.category, list);
  }

  return (
    <View className="mt-4">
      {CATEGORY_ORDER.map((cat) => {
        const list = byCategory.get(cat) ?? [];
        if (list.length === 0) return null;
        return (
          <View key={cat} className="mb-4">
            <Text className="mb-2 text-base font-semibold text-gray-900">
              {CATEGORY_LABELS[cat] ?? cat}
            </Text>
            <View className="flex-row flex-wrap">
              {list.map((b) => (
                <BadgeCard
                  key={b.id}
                  icon={b.icon}
                  name_tr={b.name_tr}
                  description_tr={b.description_tr}
                  earned={earnedIds.has(b.id)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
