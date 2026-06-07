import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { MatchesTab } from '../../components/profile/MatchesTab';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ProfileTabs, type ProfileTabKey } from '../../components/profile/ProfileTabs';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useMyProfile } from '../../hooks/use-profile';
import { useUserRankings } from '../../hooks/use-my-rankings';
import { useMyBadges } from '../../hooks/use-my-badges';
import { useAuthStore } from '../../stores/auth-store';

export default function ProfileScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<ProfileTabKey>('rankings');
  const { data: p, isLoading } = useMyProfile();
  const rankings = useUserRankings(userId);
  const myBadges = useMyBadges();

  if (isLoading || !p || !userId) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Yükleniyor...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const pronounDisplay = p.pronoun === 'other' ? p.pronoun_custom : p.pronoun;
  const dept = p.departments as { name: string }[] | { name: string } | null;
  const departmentName = Array.isArray(dept) ? dept[0]?.name : dept?.name;
  const belowName = [
    p.show_department && departmentName ? `@${departmentName}` : null,
    p.show_class_year && p.class_year ? classYearLabel(p.class_year) : null,
  ]
    .filter(Boolean)
    .join(' · ') || null;

  const highestElo = (rankings.data ?? []).reduce((m, r) => Math.max(m, r.rating), 0) || 1200;
  const pinnedIds = (p.pinned_badge_ids ?? []) as string[];
  const pinned = (myBadges.data ?? [])
    .filter((b) => pinnedIds.includes(b.badge_id))
    .map((b) => ({ id: b.badge_id, icon: b.icon, name_tr: b.name_tr }));

  return (
    <ScreenContainer scrollable>
      <ProfileHeader
        firstName={p.first_name}
        lastName={p.last_name}
        pronounDisplay={pronounDisplay}
        avatarUrl={p.avatar_url}
        highestElo={highestElo}
        pinned={pinned}
        editable
        onAvatarPress={() => router.push('/profile/edit')}
        onPinnedEditPress={() => router.push('/profile/edit?openPin=1')}
        onEditProfilePress={() => router.push('/profile/edit')}
        belowName={belowName}
      />
      <ProfileTabs active={tab} onChange={setTab} available={['rankings', 'stats', 'matches']} />
      <TabContent tabKey={tab} myUserId={userId} />
    </ScreenContainer>
  );
}

function TabContent({ tabKey, myUserId }: { tabKey: ProfileTabKey; myUserId: string }) {
  if (tabKey === 'rankings') {
    const RankingsTab = require('../../components/profile/RankingsTab').RankingsTab;
    return <RankingsTab userId={myUserId} />;
  }
  if (tabKey === 'stats') {
    const StatsTab = require('../../components/profile/StatsTab').StatsTab;
    return <StatsTab userId={myUserId} isSelf />;
  }
  if (tabKey === 'badges') {
    const BadgesTab = require('../../components/profile/BadgesTab').BadgesTab;
    return <BadgesTab userId={myUserId} />;
  }
  if (tabKey === 'elo') {
    const EloHistoryTab = require('../../components/profile/EloHistoryTab').EloHistoryTab;
    return <EloHistoryTab userId={myUserId} />;
  }
  return <MatchesTab targetUserId={myUserId} />;
}

function classYearLabel(v: string): string {
  const map: Record<string, string> = {
    hazirlik: 'Hazırlık', '1': '1. sınıf', '2': '2. sınıf', '3': '3. sınıf',
    '4': '4. sınıf', yl: 'Yüksek Lisans', doktora: 'Doktora',
  };
  return map[v] ?? v;
}
