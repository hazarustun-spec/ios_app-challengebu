// MessagesButton — header action that opens the conversation list.
//
// Extracted verbatim from the inline button that used to live only in
// `app/(tabs)/matches.tsx`, so every main tab can surface messages with the
// same 40×40 surface-2 chip + unread pip. The badge count comes from
// `useUnreadMessageCount` (the `unread_message_count` RPC) — NOT from
// `useUnreadCount`, which counts notifications.

import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Icon } from './Icon';
import { useUnreadMessageCount } from '../../hooks/use-conversations';
import { colors } from '../../theme/colors';

export function MessagesButton() {
  const { data: unread = 0 } = useUnreadMessageCount();

  return (
    <Pressable
      onPress={() => router.push('/messages' as never)}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Mesajlar, ${unread} okunmamış` : 'Mesajlar'}
      style={{
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: colors.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="mail" size={20} color={colors.text} />
      {unread > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -5,
            minWidth: 17,
            height: 17,
            paddingHorizontal: 4,
            borderRadius: 8.5,
            backgroundColor: colors.pinkDeep,
            borderWidth: 1.5,
            borderColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            className="font-sans font-extrabold"
            style={{ fontSize: 10, color: '#FFFFFF' }}
          >
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
