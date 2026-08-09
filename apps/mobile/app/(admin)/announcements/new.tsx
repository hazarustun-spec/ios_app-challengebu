// Admin · Yeni Duyuru — Plan 8 Phase G (screen 54 "compose" half).
//
// Preserves `usePublishAnnouncement` from Plan 7. Replaces the gray-on-white
// TextField shell with Plan 8's Field primitive + a typed body textarea, and
// surfaces the two policy toggles inside a single ListRow card.

import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Field } from '../../../components/ui/Field';
import { Button } from '../../../components/ui/Button';
import { Banner } from '../../../components/ui/Banner';
import { ListRow } from '../../../components/ui/ListRow';
import { Toggle } from '../../../components/ui/Toggle';
import { usePublishAnnouncement } from '../../../hooks/use-publish-announcement';
import { colors } from '../../../theme/colors';
import { userMessage } from '../../../lib/user-message';

export default function NewAnnouncementScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendPush, setSendPush] = useState(true);
  const [onlyActive, setOnlyActive] = useState(true);
  const publish = usePublishAnnouncement();

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;

  const doPublish = () => {
    publish.mutate(
      {
        title: title.trim(),
        body: body.trim(),
        targetFilter: onlyActive ? { onlyActive: true } : {},
        sendPush,
      },
      {
        onSuccess: () => router.back(),
        onError: (e) => Alert.alert('Hata', userMessage(e, 'Yayımlanamadı')),
      },
    );
  };

  const submit = () => {
    if (!canSubmit) {
      Alert.alert('Eksik', 'Başlık ve içerik zorunlu.');
      return;
    }
    const target = onlyActive ? 'tüm aktif oyuncular' : 'tüm üyeler';
    const pushPart = sendPush ? '\n\nPush bildirimi de gönderilecek.' : '';
    Alert.alert(
      'Duyuruyu yayımla?',
      `Bu duyuru ${target}'a iletilecek ve geri alınamaz.${pushPart}`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Yayımla', style: 'destructive', onPress: doPublish },
      ],
    );
  };

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Yeni Duyuru" onBack={() => router.back()} close />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Banner
            tone="info"
            title="Yayım sonrası düzenlenemez"
            body="Push gönderildiğinde tüm topluluğa anında ulaşır. Önce başlık + metni gözden geçir."
          />

          <Field
            label="Başlık"
            value={title}
            onChange={setTitle}
            placeholder="Bahar turnuvası kayıtları başladı"
            icon="megaphone"
          />

          <View style={{ gap: 8 }}>
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{
                fontSize: 11,
                letterSpacing: 1.1,
                textTransform: 'uppercase',
              }}
            >
              İçerik
            </Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Duyuru metni…"
              placeholderTextColor={colors.text3}
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 140,
                padding: 14,
                borderRadius: 18,
                borderWidth: 1.5,
                borderColor: colors.borderStrong,
                backgroundColor: colors.surface,
                fontFamily: 'PlusJakartaSans-Regular',
                fontSize: 15,
                color: colors.text,
              }}
            />
          </View>

          <View
            className="bg-surface rounded-lg overflow-hidden"
            style={{ borderWidth: 1, borderColor: colors.borderStrong }}
          >
            <ListRow
              icon="people"
              title="Sadece aktif oyuncular"
              subtitle="Banlı/askıdaki kullanıcılar atlanır"
              right={<Toggle value={onlyActive} onChange={setOnlyActive} />}
            />
            <View style={{ height: 1, backgroundColor: colors.surface3 }} />
            <ListRow
              icon="bell"
              title="Push bildirimi de gönder"
              subtitle="Kullanıcının tercihi açıksa iletilir"
              right={<Toggle value={sendPush} onChange={setSendPush} />}
            />
          </View>

          <Button
            variant="primary"
            full
            disabled={!canSubmit}
            loading={publish.isPending}
            onPress={submit}
          >
            Tüm topluluğa yayımla
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
