import { Pressable, Text, View } from 'react-native';

export interface PinnedBadgeView {
  id: string;
  icon: string;
  name_tr: string;
}

interface Props {
  pinned: PinnedBadgeView[];
  editable?: boolean;
  onEditPress?: () => void;
}

export function PinnedBadges({ pinned, editable = false, onEditPress }: Props) {
  const slots: (PinnedBadgeView | null)[] = [
    pinned[0] ?? null,
    pinned[1] ?? null,
    pinned[2] ?? null,
  ];
  return (
    <Pressable
      onPress={editable ? onEditPress : undefined}
      className="mt-2 flex-row items-center justify-center gap-2"
    >
      {slots.map((b, i) => (
        <View
          key={i}
          className="h-12 w-12 items-center justify-center rounded-lg border border-gray-300 bg-white"
        >
          <Text className="text-2xl">{b?.icon ?? '➕'}</Text>
        </View>
      ))}
      {editable && (
        <Text className="ml-2 text-xs text-gray-500">Düzenle</Text>
      )}
    </Pressable>
  );
}
