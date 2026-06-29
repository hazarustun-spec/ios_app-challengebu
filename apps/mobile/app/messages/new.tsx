// apps/mobile/app/messages/new.tsx — Plan 8 UI Redesign.
//
// "Yeni mesaj" compose screen.
//
// Shows a searchable list of everyone the current user can message (anyone they
// share a match_request with, excluding blocked users).  Tapping a contact
// calls get_or_create_conversation via useStartConversation and navigates to
// the thread.
//
// Data: useMessageableContacts() → MessageableContact[]
// Style mirrors app/match/new/opponent.tsx.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';
import { NavHeader } from '../../components/ui/NavHeader';
import {
  useMessageableContacts,
  type MessageableContact,
} from '../../hooks/use-messageable-contacts';
import { useStartConversation } from '../../hooks/use-start-conversation';
import { colors } from '../../theme/colors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Short relative date label in Turkish for the last_at timestamp. */
function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'şimdi';
  if (diffMin < 60) return `${diffMin}dk`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}sa`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}g`;
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function NewMessageScreen() {
  const contactsQ = useMessageableContacts();
  const { start } = useStartConversation();
  const [q, setQ] = useState('');

  const header = (
    <NavHeader title="Yeni mesaj" onBack={() => router.back()} />
  );

  if (contactsQ.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (contactsQ.isError) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center">
          <EmptyState
            icon="mail"
            title="Yüklenemedi"
            body="Kişiler alınamadı. Lütfen tekrar dene."
            tone="error"
            action="Tekrar dene"
            onAction={() => contactsQ.refetch()}
          />
        </View>
      </View>
    );
  }

  const allContacts: MessageableContact[] = contactsQ.data ?? [];

  const filtered = allContacts.filter((c) => {
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
    return fullName.includes(q.toLowerCase());
  });

  if (allContacts.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <EmptyState
          icon="mail"
          title="Mesajlaşabileceğin kimse yok"
          body="Biriyle mesajlaşmak için önce bir maç teklifi gönder veya kabul et."
          action="Yeni Maç"
          onAction={() => router.push('/match/new/type' as never)}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}

      {/* Search field */}
      <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 10 }}>
        <Field
          icon="search"
          placeholder="İsim ara…"
          value={q}
          onChange={setQ}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 8 }}>
        {filtered.length === 0 ? (
          <Text
            className="font-sans text-text-3"
            style={{ fontSize: 13, paddingHorizontal: 4, paddingTop: 8 }}
          >
            Eşleşen kişi bulunamadı.
          </Text>
        ) : (
          filtered.map((contact) => (
            <ContactRow
              key={contact.other_user_id}
              contact={contact}
              onPress={() =>
                start({
                  requestId: contact.request_id,
                  otherUserId: contact.other_user_id,
                  name: `${contact.first_name} ${contact.last_name}`.trim(),
                })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

interface ContactRowProps {
  contact: MessageableContact;
  onPress: () => void;
}

function ContactRow({ contact, onPress }: ContactRowProps) {
  const fullName = `${contact.first_name} ${contact.last_name}`.trim();

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center"
      style={{
        padding: 12,
        paddingHorizontal: 13,
        gap: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.surface3,
        backgroundColor: colors.surface,
      }}
    >
      <Avatar
        name={fullName}
        size={44}
        uri={contact.avatar_url ?? undefined}
      />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          className="font-sans font-semibold text-text"
          style={{ fontSize: 13.5, lineHeight: 19 }}
          numberOfLines={1}
        >
          {fullName}
        </Text>
      </View>

      <Text
        className="font-sans text-text-3"
        style={{ fontSize: 11.5 }}
      >
        {relativeTime(contact.last_at)}
      </Text>
    </Pressable>
  );
}
