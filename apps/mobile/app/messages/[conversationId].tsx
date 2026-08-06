// Messaging thread screen — Plan 8.
//
// Route: /messages/[conversationId]
// Params: conversationId (required), otherUserId + name (optional, passed by callers).
//
// Wires to:
//   useMessages(conversationId)         — live FlatList of MessageRow[]
//   useSendMessage()                    — mutate({ conversationId, body })
//   useMarkConversationRead()           — mutate(conversationId) on mount
//   useBlockUser()                      — mutate({ blockedId: otherUserId })
//   useReportUser()                     — mutate({ reportedId: otherUserId, reason })
//   useAuthStore(s => s.user?.id)       — determine mine vs theirs for bubble alignment

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { NavHeader } from '../../components/ui/NavHeader';
import { Sheet } from '../../components/ui/Sheet';
import { Icon } from '../../components/ui/Icon';
import {
  useMessages,
  useSendMessage,
  useMarkConversationRead,
  useDeleteMessage,
  type MessageRow,
} from '../../hooks/use-messages';
import { useBlockUser, useReportUser } from '../../hooks/use-moderation';
import { useAuthStore } from '../../stores/auth-store';
import { colors } from '../../theme/colors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBubbleTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Bubble component
// ---------------------------------------------------------------------------

interface BubbleProps {
  item: MessageRow;
  isMine: boolean;
  onLongPress?: () => void;
}

function Bubble({ item, isMine, onLongPress }: BubbleProps) {
  const isDeleted = !!item.deleted_at;
  return (
    <View
      style={{
        alignSelf: isMine ? 'flex-end' : 'flex-start',
        maxWidth: '78%',
        marginBottom: 6,
      }}
    >
      <Pressable
        onLongPress={isMine && !isDeleted ? onLongPress : undefined}
        delayLongPress={300}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: 18,
          borderBottomRightRadius: isMine ? 4 : 18,
          borderBottomLeftRadius: isMine ? 18 : 4,
          backgroundColor: isDeleted
            ? colors.surface2
            : isMine
            ? colors.clay
            : colors.surface2,
          // Subtle border for theirs
          borderWidth: isMine && !isDeleted ? 0 : 1,
          borderColor: colors.surface3,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            lineHeight: 21,
            fontStyle: isDeleted ? 'italic' : 'normal',
            color: isDeleted
              ? colors.text3
              : isMine
              ? '#FFFFFF'
              : colors.text,
            fontFamily: undefined, // inherits NativeWind sans
          }}
        >
          {isDeleted ? 'Bu mesaj silindi' : item.body}
        </Text>
      </Pressable>
      {isMine ? (
        // Sent bubble footer: time + read/delivery status
        <View
          style={{
            flexDirection: 'row',
            alignSelf: 'flex-end',
            gap: 5,
            marginTop: 3,
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ fontSize: 11, color: colors.text3 }}>
            {formatBubbleTime(item.created_at)}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: item.read_at ? colors.win : colors.text3,
            }}
          >
            {item.read_at ? 'Okundu' : 'İletildi'}
          </Text>
        </View>
      ) : (
        <Text
          style={{
            fontSize: 11,
            color: colors.text3,
            marginTop: 3,
            alignSelf: 'flex-start',
            paddingHorizontal: 4,
          }}
        >
          {formatBubbleTime(item.created_at)}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ConversationScreen() {
  const { conversationId, otherUserId, name } =
    useLocalSearchParams<{
      conversationId: string;
      otherUserId?: string;
      name?: string;
    }>();

  const myUserId = useAuthStore((s) => s.user?.id);
  const insets = useSafeAreaInsets();

  // Hooks
  const { data: messages = [], isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();
  const deleteMessage = useDeleteMessage();
  const blockUser = useBlockUser();
  const reportUser = useReportUser();

  // Local state
  const [body, setBody] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const flatListRef = useRef<FlatList<MessageRow>>(null);

  // Mark conversation read on mount
  useEffect(() => {
    if (conversationId) {
      markRead.mutate(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // FlatList is NOT inverted — scroll to last item
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages.length]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate(
      { conversationId: conversationId!, body: trimmed },
      { onSuccess: () => setBody('') },
    );
  }

  function handleDeleteMessage(messageId: string) {
    Alert.alert(
      'Mesajı sil',
      'Bu mesaj herkesten silinsin mi? Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Herkesten sil',
          style: 'destructive',
          onPress: () => {
            deleteMessage.mutate(
              { messageId, conversationId: conversationId! },
              {
                onError: () =>
                  Alert.alert('Hata', 'Mesaj silinemedi, tekrar dene.'),
              },
            );
          },
        },
      ],
    );
  }

  function handleReport() {
    setMenuOpen(false);
    if (!otherUserId) return;
    Alert.alert(
      'Şikâyet et',
      'Bu kullanıcıyı uygunsuz davranış nedeniyle şikayet etmek istiyor musun?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Şikayet gönder',
          style: 'destructive',
          onPress: () => {
            reportUser.mutate(
              { reportedId: otherUserId, reason: 'inappropriate_message' },
              {
                onSuccess: () =>
                  Alert.alert('Teşekkürler', 'Şikayetin alındı, incelenecek.'),
                onError: () =>
                  Alert.alert('Hata', 'Şikayet gönderilemedi, tekrar dene.'),
              },
            );
          },
        },
      ],
    );
  }

  function handleBlock() {
    setMenuOpen(false);
    if (!otherUserId) return;
    Alert.alert(
      'Engelle',
      `${name ?? 'Bu kullanıcıyı'} engellemek istediğinden emin misin? Birbirinizle iletişime geçemeyeceksiniz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Engelle',
          style: 'destructive',
          onPress: () => {
            blockUser.mutate(
              { blockedId: otherUserId },
              {
                onSuccess: () => router.back(),
                onError: () =>
                  Alert.alert('Hata', 'Engelleme işlemi başarısız, tekrar dene.'),
              },
            );
          },
        },
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const canSend = body.trim().length > 0 && !sendMessage.isPending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <NavHeader
        title={name ?? 'Sohbet'}
        onBack={() => router.back()}
        actionIcon="dots"
        onAction={() => setMenuOpen(true)}
        onPressTitle={
          otherUserId
            ? () => router.push(`/user/${otherUserId}` as const)
            : undefined
        }
      />

      {/* Message list */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : messages.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            style={{
              fontSize: 14,
              color: colors.text3,
              fontStyle: 'italic',
            }}
          >
            İlk mesajı sen at
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          // flex:1 bounds the list to the space between the header and the
          // composer. Without it the list sizes to its content and, once there
          // are enough messages, grows past the screen bottom — pushing the
          // composer (and its send button) off-screen. The loading/empty
          // branches above already use a flex:1 container; match that here.
          style={{ flex: 1 }}
          renderItem={({ item }) => (
            <Bubble
              item={item}
              isMine={item.sender_id === myUserId}
              onLongPress={() => handleDeleteMessage(item.id)}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
            // Anchor a short thread to the composer instead of the header.
            // flexGrow lets the content box fill the list's height when the
            // messages are shorter than the viewport; justifyContent then
            // pushes them down. Once the thread overflows, flexGrow stops
            // mattering and normal scrolling takes over.
            flexGrow: 1,
            justifyContent: 'flex-end',
          }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />
      )}

      {/* Composer */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 10,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: insets.bottom + 10,
          borderTopWidth: 1,
          borderTopColor: colors.surface3,
          backgroundColor: colors.bg,
        }}
      >
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Mesaj yaz…"
          placeholderTextColor={colors.text3}
          multiline
          maxLength={1000}
          style={{
            flex: 1,
            minHeight: 42,
            maxHeight: 120,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 21,
            borderWidth: 1,
            borderColor: colors.surface3,
            backgroundColor: colors.surface2,
            fontSize: 15,
            lineHeight: 20,
            color: colors.text,
          }}
          returnKeyType="default"
          blurOnSubmit={false}
        />
        {/* Send.
            The circle is drawn by a plain View, not by the Pressable's own
            style. On device the Pressable's function-form style was not
            painting its backgroundColor at all — the arrow rendered bare on
            the white composer, so the moment `canSend` turned it white it
            vanished. Typing made the send button disappear.
            Keeping the fill on an inner View makes it independent of however
            the Pressable resolves its style, and `pressed` only drives
            opacity, which cannot fail the same way.

            Both states must stay legible on their own fill: white on clay
            when sending is possible, text-2 on surface-2 when it is not.
            text-2 rather than text-3 because text-3 on that fill is about
            2:1, under the 3:1 WCAG minimum for a non-text control. */}
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          hitSlop={6}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Gönder"
          accessibilityState={{ disabled: !canSend }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: canSend ? colors.clay : colors.surface2,
              borderWidth: canSend ? 0 : 1,
              borderColor: colors.surface3,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="arrowUp" size={20} color={canSend ? '#FFFFFF' : colors.text2} />
          </View>
        </Pressable>
      </View>

      {/* Action sheet — block / report */}
      <Sheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={name ? `${name}` : undefined}
      >
        <View style={{ gap: 8, paddingBottom: 4 }}>
          {/* Report */}
          <Pressable
            onPress={otherUserId ? handleReport : undefined}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 14,
              backgroundColor: pressed && otherUserId
                ? colors.pinkSoft
                : colors.surface2,
              opacity: otherUserId ? 1 : 0.4,
            })}
            accessibilityRole="button"
            accessibilityLabel="Şikayet et"
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${colors.pinkDeep}18`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="flag" size={18} color={colors.pinkDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: colors.pinkDeep,
                }}
              >
                Şikâyet et
              </Text>
              <Text
                style={{
                  fontSize: 12.5,
                  color: colors.text2,
                  marginTop: 1,
                }}
              >
                Uygunsuz davranışı bildir
              </Text>
            </View>
          </Pressable>

          {/* Block */}
          <Pressable
            onPress={otherUserId ? handleBlock : undefined}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 14,
              backgroundColor: pressed && otherUserId
                ? `${colors.loss}14`
                : colors.surface2,
              opacity: otherUserId ? 1 : 0.4,
            })}
            accessibilityRole="button"
            accessibilityLabel="Engelle"
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${colors.loss}18`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="ban" size={18} color={colors.loss} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: colors.loss,
                }}
              >
                Engelle
              </Text>
              <Text
                style={{
                  fontSize: 12.5,
                  color: colors.text2,
                  marginTop: 1,
                }}
              >
                Bu kişi sana ulaşamaz
              </Text>
            </View>
          </Pressable>

          {/* Cancel */}
          <Pressable
            onPress={() => setMenuOpen(false)}
            style={({ pressed }) => ({
              alignItems: 'center',
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: pressed ? colors.surface3 : colors.surface2,
              marginTop: 4,
            })}
            accessibilityRole="button"
            accessibilityLabel="Vazgeç"
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: colors.text2,
              }}
            >
              Vazgeç
            </Text>
          </Pressable>
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
}
