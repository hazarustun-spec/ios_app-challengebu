import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { MatchesTab } from '../../components/profile/MatchesTab';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import {
  ProfileTabs,
  type ProfileTabKey,
} from '../../components/profile/ProfileTabs';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useUserBadges } from '../../hooks/use-my-badges';
import { useUserRankings } from '../../hooks/use-my-rankings';
import { useOtherPlayerProfile } from '../../hooks/use-other-player-profile';
import { useMyProfile } from '../../hooks/use-profile';
import { HeadToHeadSummary } from '../../components/profile/HeadToHeadSummary';

export default function OtherPlayerProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [tab, setTab] = useState<ProfileTabKey>('rankings');
  const { data: profile, isLoading } = useOtherPlayerProfile(userId);
  const { data: myProfile } = useMyProfile();
  const rankings = useUserRankings(userId);
  const badges = useUserBadges(userId);

  if (isLoading || !profile || !userId) {
    return (
      <ScreenContainer>
        <Text className="text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }

  const pronounDisplay = profile.pronoun === 'other' ? profile.pronoun_custom : profile.pronoun;
  const dept = profile.departments as { name: string }[] | { name: string } | null;
  const departmentName = Array.isArray(dept) ? dept[0]?.name : dept?.name;
  const belowName = [
    profile.show_department && departmentName ? `@${departmentName}` : null,
    profile.show_class_year && profile.class_year ? classYearLabel(profile.class_year) : null,
  ]
    .filter(Boolean)
    .join(' · ') || null;

  const highestElo = (rankings.data ?? []).reduce((m, r) => Math.max(m, r.rating), 0) || 1200;
  const pinnedIds = profile.pinned_badge_ids ?? [];
  const pinned = (badges.data ?? [])
    .filter((b) => pinnedIds.includes(b.badge_id))
    .map((b) => ({ id: b.badge_id, icon: b.icon, name_tr: b.name_tr }));

  const canChallenge = canSinglesChallengeBetween(
    profile.gender_category,
    myProfile?.gender_category,
  );

  return (
    <ScreenContainer scrollable>
      <ProfileHeader
        firstName={profile.first_name}
        lastName={profile.last_name}
        pronounDisplay={pronounDisplay}
        avatarUrl={profile.avatar_url}
        highestElo={highestElo}
        pinned={pinned}
        editable={false}
        belowName={belowName}
      />

      {myProfile && myProfile.user_id !== userId && (
        <HeadToHeadSummary otherUserId={userId} />
      )}

      {canChallenge && myProfile && myProfile.user_id !== userId && (
        <View className="mt-3">
          <Button onPress={() => router.push(`/create-match?opponentId=${userId}`)}>
            Meydan Oku
          </Button>
        </View>
      )}

      <ProfileTabs
        active={tab}
        onChange={setTab}
        available={['rankings', 'stats', 'badges', 'elo', 'matches']}
      />
      <TabContent tabKey={tab} userId={userId} />
    </ScreenContainer>
  );
}

function TabContent({ tabKey, userId }: { tabKey: ProfileTabKey; userId: string }) {
  if (tabKey === 'rankings') {
    const RankingsTab = require('../../components/profile/RankingsTab').RankingsTab;
    return <RankingsTab userId={userId} />;
  }
  if (tabKey === 'stats') {
    const StatsTab = require('../../components/profile/StatsTab').StatsTab;
    return <StatsTab userId={userId} isSelf={false} />;
  }
  if (tabKey === 'badges') {
    const BadgesTab = require('../../components/profile/BadgesTab').BadgesTab;
    return <BadgesTab userId={userId} />;
  }
  if (tabKey === 'elo') {
    const EloHistoryTab = require('../../components/profile/EloHistoryTab').EloHistoryTab;
    return <EloHistoryTab userId={userId} />;
  }
  return <MatchesTab targetUserId={userId} />;
}

// Singles-only: gates the 1v1 "Meydan Oku" CTA. Doubles formats (incl.
// karma_cift) use a different flow that recruits partners and can pair
// different gender_categories, so this returns false for erkek vs kadin.
function canSinglesChallengeBetween(
  target: 'erkek' | 'kadin' | 'open_only',
  mine: 'erkek' | 'kadin' | 'open_only' | undefined,
): boolean {
  if (!mine) return false;
  if (mine === 'open_only' || target === 'open_only') return true;
  return mine === target;
}

function classYearLabel(v: string): string {
  const map: Record<string, string> = {
    hazirlik: 'Hazırlık', '1': '1. sınıf', '2': '2. sınıf', '3': '3. sınıf',
    '4': '4. sınıf', yl: 'Yüksek Lisans', doktora: 'Doktora',
  };
  return map[v] ?? v;
}
