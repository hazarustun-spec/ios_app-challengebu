// Messaging thread screen — Plan 8.
//
// Route: /messages/[conversationId]
// Params: conversationId (required), otherUserId + name (optional, passed by callers).
//
// Wires to:
//   useMessages(conversationId)         — paginated + live inverted FlatList
//   useSendMessage()                    — mutate({ conversationId, body })
//   useMarkConversationRead()           — mutate(conversationId) on mount
//   useBlockUser()                      — mutate({ blockedId: otherUserId })
//   useReportUser()                     — mutate({ reportedId: otherUserId, reason })
//   useAuthStore(s => s.user?.id)       — determine mine vs theirs for bubble alignment

import { useEffect, useState } from 'react';
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
import { useTypingIndicator } from '../../hooks/use-typing-indicator';
import { useAuthStore } from '../../stores/auth-store';
import { useMessageOutboxStore } from '../../stores/message-outbox-store';
import { useToast } from '../../components/ui/ToastProvider';
import { userMessage } from '../../lib/user-message';
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
  /** Retry tap — only wired for rows sitting in the outbox as `failed`. */
  onPress?: () => void;
}

function Bubble({ item, isMine, onLongPress, onPress }: BubbleProps) {
  const isDeleted = !!item.deleted_at;
  const isPending = !!item.pending;
  const isFailed = item.outboxStatus === 'failed';
  return (
    <View
      style={{
        alignSelf: isMine ? 'flex-end' : 'flex-start',
        maxWidth: '78%',
        marginBottom: 6,
        // In-flight rows fade until the server confirms them; a failed row
        // stays a touch faded too, so an unsent bubble never reads as sent.
        opacity: isPending ? 0.65 : isFailed ? 0.8 : 1,
      }}
    >
      <Pressable
        // Long-press deletes for everyone, so it needs a server id: an outbox
        // row (sending OR failed) is discarded locally instead — see the
        // screen's handlers.
        onLongPress={isMine && !isDeleted && !isPending ? onLongPress : undefined}
        onPress={isFailed ? onPress : undefined}
        delayLongPress={300}
        accessibilityRole={isFailed ? 'button' : undefined}
        accessibilityLabel={
          isFailed ? 'Gönderilemedi. Yeniden göndermek için dokun' : undefined
        }
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
          // Subtle border for theirs; a failed row gets a loss-coloured one so
          // the state is carried by more than the footer text alone.
          borderWidth: isFailed ? 1.5 : isMine && !isDeleted ? 0 : 1,
          borderColor: isFailed ? colors.loss : colors.surface3,
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
            alignItems: 'center',
            alignSelf: 'flex-end',
            gap: 5,
            marginTop: 3,
            paddingHorizontal: 4,
          }}
        >
          {isFailed ? <Icon name="warn" size={12} color={colors.loss} /> : null}
          <Text style={{ fontSize: 11, color: colors.text3 }}>
            {formatBubbleTime(item.created_at)}
          </Text>
          {/* Delivered / read state.
              Failed and in-flight rows keep words: those two states are
              actionable (one wants a retry tap, the other says "wait") and a
              glyph alone would not say so. Once the server has the message the
              distinction is routine, so it becomes a tick — one for delivered,
              two for read — which is the convention every messenger uses and
              costs no width in a 78%-wide bubble.
              `accessibilityLabel` carries the old wording so the meaning
              survives for screen readers. */}
          {isFailed || isPending ? (
            <Text
              style={{
                fontSize: 11,
                fontWeight: isFailed ? '600' : '400',
                color: isFailed ? colors.loss : colors.text3,
              }}
            >
              {isFailed ? 'Gönderilemedi' : 'Gönderiliyor…'}
            </Text>
          ) : (
            <Icon
              name={item.read_at ? 'checkDouble' : 'check'}
              size={13}
              color={item.read_at ? colors.win : colors.text3}
              accessibilityLabel={item.read_at ? 'Okundu' : 'İletildi'}
            />
          )}
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
      {isFailed ? (
        // Second line so the hint can't push the timestamp row out of the
        // bubble's 78% width.
        <Text
          style={{
            fontSize: 11,
            color: colors.text2,
            marginTop: 1,
            alignSelf: 'flex-end',
            paddingHorizontal: 4,
            textAlign: 'right',
          }}
        >
          Yeniden göndermek için dokun
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

/**
 * Shaped like a received bubble so it reads as "their side is doing something"
 * without any animation — three static dots. A pulsing animation would need a
 * Reanimated loop mounted and unmounted on every keystroke burst, which is a
 * lot of machinery for a hint that is on screen for two seconds at a time.
 */
function TypingBubble({ name }: { name?: string }) {
  return (
    <View
      style={{ alignSelf: 'flex-start', maxWidth: '78%', marginBottom: 6 }}
      accessibilityRole="text"
      accessibilityLabel={`${name ?? 'Karşı taraf'} yazıyor`}
    >
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: 18,
          borderBottomLeftRadius: 4,
          backgroundColor: colors.surface2,
          borderWidth: 1,
          borderColor: colors.surface3,
        }}
      >
        <Text style={{ fontSize: 15, lineHeight: 21, color: colors.text3 }}>
          yazıyor…
        </Text>
      </View>
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
  const toast = useToast();

  // Hooks
  const {
    messages,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  // A second instance so a retry in flight does not disable the composer's
  // send button (`canSend` watches `sendMessage.isPending`).
  const retryMessage = useSendMessage();
  const removeFromOutbox = useMessageOutboxStore((s) => s.remove);
  const markRead = useMarkConversationRead();
  const deleteMessage = useDeleteMessage();
  const blockUser = useBlockUser();
  const reportUser = useReportUser();
  const { isOtherTyping, notifyTyping, notifyStopped } = useTypingIndicator(
    conversationId,
    myUserId,
  );

  // Local state
  const [body, setBody] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  // Mark conversation read on mount
  useEffect(() => {
    if (conversationId) {
      markRead.mutate(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sendMessage.isPending) return;
    // Clear the composer up-front. The hook's onMutate has already painted the
    // outbox bubble, so leaving the text in the input would show the same
    // message twice.
    setBody('');
    notifyStopped();
    sendMessage.mutate(
      { conversationId: conversationId!, body: trimmed },
      {
        // Blocked-user (`Messaging is blocked between these users`) and other
        // backend rejections used to fail silently. The toast still explains
        // why; the draft is NOT pushed back into the composer any more —
        // the failed bubble now holds the text and offers a retry tap, and
        // restoring it here would show the same message in two places.
        onError: (e) => {
          toast.show(userMessage(e, 'Mesaj gönderilemedi.'), 'error');
        },
      },
    );
  }

  /** Re-sends a row that is sitting in the outbox as `failed`. */
  function handleRetry(item: MessageRow) {
    if (item.outboxStatus !== 'failed') return;
    retryMessage.mutate(
      {
        conversationId: conversationId!,
        body: item.body,
        outboxId: item.id,
      },
      {
        onError: (e) =>
          toast.show(userMessage(e, 'Mesaj gönderilemedi.'), 'error'),
      },
    );
  }

  /**
   * Long-press on an unsent row. There is no server row to tombstone, so this
   * must never reach `delete_message` — it just drops the outbox entry.
   */
  function handleDiscardOutbox(item: MessageRow) {
    Alert.alert(
      'Gönderilmemiş mesaj',
      'Bu mesaj hiç gönderilemedi. Silmek istiyor musun?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => removeFromOutbox(item.id),
        },
      ],
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
        // The FlatList (and with it the typing bubble in its header) is not
        // mounted on an empty thread, so carry the indicator here too — a
        // brand-new conversation is exactly when the other side typing first
        // is worth seeing.
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text
            style={{
              fontSize: 14,
              color: colors.text3,
              fontStyle: 'italic',
              textAlign: 'center',
            }}
          >
            İlk mesajı sen at
          </Text>
          {isOtherTyping ? (
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              <TypingBubble name={name} />
            </View>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          // Inverted: `messages` is newest-first, so index 0 paints at the
          // bottom and the list sticks there on its own — no scrollToEnd
          // timers and no flexGrow/justify-end trick to anchor a short thread.
          // It also puts `onEndReached` at the TOP of the thread, which is
          // where "load older messages" belongs.
          inverted
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
              onLongPress={() =>
                // Outbox rows have no server id — discarding one locally is the
                // only thing "delete" can mean for them.
                item.outboxStatus
                  ? handleDiscardOutbox(item)
                  : handleDeleteMessage(item.id)
              }
              onPress={() => handleRetry(item)}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
          // Inverted, so the header paints at the BOTTOM of the thread —
          // directly above the composer, which is where a typing indicator
          // belongs, and it rides the scroll instead of floating over it.
          ListHeaderComponent={
            isOtherTyping ? <TypingBubble name={name} /> : null
          }
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          // Inverted lists draw the footer at the top, which is exactly where
          // the older page is loading in from.
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <ActivityIndicator color={colors.clay} />
              </View>
            ) : null
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
          onChangeText={(next) => {
            setBody(next);
            // An empty box is not "typing" — clearing the draft by backspace
            // should retract the indicator, not keep broadcasting.
            if (next.trim()) notifyTyping();
            else notifyStopped();
          }}
          placeholder="Mesaj yaz…"
          placeholderTextColor={colors.text3}
          multiline
          maxLength={1000}
          style={{
            flex: 1,
            minHeight: 42,
            // Six lines before the input starts scrolling:
            // 6 × lineHeight 20 + paddingVertical 10 × 2 + borderWidth 1 × 2.
            maxHeight: 142,
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
          className="active:opacity-70"
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
            // Plain object, not `({ pressed }) => …`: NativeWind's interop
            // spreads the style prop, and spreading a function yields {} —
            // which then overwrites the real styles. Press feedback goes
            // through `active:` instead, which the className path handles.
            className="active:opacity-70"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 14,
              backgroundColor: colors.surface2,
              opacity: otherUserId ? 1 : 0.4,
            }}
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
            className="active:opacity-70"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 14,
              backgroundColor: colors.surface2,
              opacity: otherUserId ? 1 : 0.4,
            }}
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
            className="active:opacity-70"
            style={{
              alignItems: 'center',
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: colors.surface2,
              marginTop: 4,
            }}
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
