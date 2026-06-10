import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { TextField } from '../../../components/ui/TextField';
import { Toggle } from '../../../components/ui/Toggle';
import { usePublishAnnouncement } from '../../../hooks/use-publish-announcement';

export default function NewAnnouncementScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendPush, setSendPush] = useState(true);
  const [onlyActive, setOnlyActive] = useState(true);
  const publish = usePublishAnnouncement();

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
        onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'Yayımlanamadı'),
      },
    );
  };

  const submit = () => {
    if (title.trim().length === 0 || body.trim().length === 0) {
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
    <ScreenContainer scrollable>
      <View className="gap-3">
        <TextField label="Başlık" value={title} onChangeText={setTitle} />
        <TextField
          label="İçerik"
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={5}
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />
        <View className="mb-3 flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
          <Text className="flex-1 text-base text-gray-800">Sadece aktif oyunculara</Text>
          <Toggle value={onlyActive} onChange={setOnlyActive} />
        </View>
        <View className="mb-3 flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
          <Text className="flex-1 text-base text-gray-800">Push bildirimi de gönder</Text>
          <Toggle value={sendPush} onChange={setSendPush} />
        </View>
        <Text className="text-[10px] text-gray-500">
          Push, kullanıcının &quot;Topluluk duyuruları&quot; tercihi açıksa gönderilir.
        </Text>
        <Button onPress={submit} loading={publish.isPending}>
          Duyuru yayımla
        </Button>
      </View>
    </ScreenContainer>
  );
}
