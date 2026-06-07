import { Pressable, ScrollView, Text } from 'react-native';

export type ProfileTabKey = 'rankings' | 'stats' | 'badges' | 'elo' | 'matches';

export const PROFILE_TAB_LABELS: Record<ProfileTabKey, string> = {
  rankings: 'Sıralamalar',
  stats: 'İstatistikler',
  badges: 'Rozetler',
  elo: 'ELO Geçmişi',
  matches: 'Maçlar',
};

interface Props {
  active: ProfileTabKey;
  onChange: (key: ProfileTabKey) => void;
  available?: ProfileTabKey[];
}

const ORDER: ProfileTabKey[] = ['rankings', 'stats', 'badges', 'elo', 'matches'];

export function ProfileTabs({ active, onChange, available }: Props) {
  const tabs = available ?? ORDER;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
      {tabs.map((k) => {
        const isActive = active === k;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            className={`mr-2 rounded-full px-4 py-2 ${
              isActive ? 'bg-primary' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                isActive ? 'text-white' : 'text-gray-700'
              }`}
            >
              {PROFILE_TAB_LABELS[k]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
