import { Image, Pressable, Text, View } from 'react-native';
import type { PinnedBadgeView } from './PinnedBadges';
import { LevelBadge } from './LevelBadge';
import { PinnedBadges } from './PinnedBadges';
import { PastChampionPill } from '../seasons/PastChampionPill';
import type { PastChampion } from '../../hooks/use-past-champion';

interface Props {
  firstName: string;
  lastName: string;
  pronounDisplay?: string | null;
  avatarUrl?: string | null;
  highestElo: number;
  pinned: PinnedBadgeView[];
  editable: boolean;
  onAvatarPress?: () => void;
  onPinnedEditPress?: () => void;
  onEditProfilePress?: () => void;
  belowName?: string | null;
  pastChampion?: PastChampion | null;
}

export function ProfileHeader(props: Props) {
  const initials = `${props.firstName?.[0] ?? ''}${props.lastName?.[0] ?? ''}`;
  return (
    <View className="items-center pt-6">
      <Pressable
        onPress={props.editable ? props.onAvatarPress : undefined}
        className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-200"
      >
        {props.avatarUrl ? (
          <Image source={{ uri: props.avatarUrl }} className="h-24 w-24" />
        ) : (
          <Text className="text-3xl text-gray-500">{initials}</Text>
        )}
      </Pressable>
      <View className="mt-3 flex-row items-center">
        <Text className="text-xl font-bold text-gray-900">
          {props.firstName} {props.lastName}
        </Text>
        {props.pronounDisplay && (
          <Text className="ml-2 text-gray-600">({props.pronounDisplay})</Text>
        )}
      </View>
      {props.belowName && (
        <Text className="mt-1 text-sm text-gray-500">{props.belowName}</Text>
      )}
      {props.pastChampion && <PastChampionPill champion={props.pastChampion} />}
      <View className="mt-2">
        <LevelBadge highestElo={props.highestElo} />
      </View>
      <PinnedBadges
        pinned={props.pinned}
        editable={props.editable}
        onEditPress={props.onPinnedEditPress}
      />
      {props.editable && (
        <Pressable
          onPress={props.onEditProfilePress}
          className="mt-3 rounded-full border border-primary px-4 py-1"
        >
          <Text className="text-sm font-semibold text-primary">Profili Düzenle</Text>
        </Pressable>
      )}
    </View>
  );
}
