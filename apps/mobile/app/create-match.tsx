import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { CourtPicker } from '../components/matches/CourtPicker';
import { DateTimeField } from '../components/matches/DateTimePicker';
import { FormatPicker, type MatchFormat } from '../components/matches/FormatPicker';
import { PlayerPicker } from '../components/matches/PlayerPicker';
import { Button } from '../components/ui/Button';
import { RadioGroup } from '../components/ui/RadioGroup';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useCreateMatchRequest } from '../hooks/use-create-match-request';

type RequestType = 'direct_challenge' | 'open_call';

const CATEGORIES = [
  { value: 'erkek_tek', label: 'Erkek Tek' },
  { value: 'kadin_tek', label: 'Kadın Tek' },
  { value: 'open_tek', label: 'Open Tek' },
  { value: 'erkek_cift', label: 'Erkek Çift' },
  { value: 'kadin_cift', label: 'Kadın Çift' },
  { value: 'karma_cift', label: 'Karma Çift' },
  { value: 'open_cift', label: 'Open Çift' },
];

export default function CreateMatchScreen() {
  const { opponentId } = useLocalSearchParams<{ opponentId?: string }>();
  const [type, setType] = useState<RequestType>('direct_challenge');
  const [targetId, setTargetId] = useState<string | undefined>(opponentId);
  const [category, setCategory] = useState<string>();
  const [format, setFormat] = useState<MatchFormat>();
  const [isRated, setIsRated] = useState(true);
  const [court, setCourt] = useState<string>();
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState<Date>();

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const create = useCreateMatchRequest();

  const validate = () => {
    const errs: Record<string, string | undefined> = {};
    if (type === 'direct_challenge' && !targetId) errs.target = 'Rakip seç';
    if (!category) errs.category = 'Kategori seç';
    if (!format) errs.format = 'Format seç';
    if (!court) errs.court = 'Kort seç';
    if (!date) errs.date = 'Tarih seç';
    if (!time) errs.time = 'Saat seç';
    setErrors(errs);
    return Object.values(errs).every((e) => !e);
  };

  const onSubmit = () => {
    if (!validate()) return;
    if (!category || !format || !court || !date || !time) return;

    const proposedDate = date.toISOString().slice(0, 10);
    const proposedTime = time.toTimeString().slice(0, 5);

    create.mutate(
      {
        type,
        targetId: type === 'direct_challenge' ? targetId : undefined,
        category,
        format,
        isRated,
        proposedDate,
        proposedTime,
        courtId: court,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (e) => {
          Alert.alert('Hata', e instanceof Error ? e.message : 'Oluşturulamadı');
        },
      },
    );
  };

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

  return (
    <>
      <Stack.Screen options={{ presentation: 'modal', title: 'Maç oluştur', headerShown: true }} />
      <ScreenContainer scrollable>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View className="mb-4 flex-row rounded-lg bg-gray-100 p-1">
            <Pressable
              onPress={() => setType('direct_challenge')}
              className={`flex-1 items-center rounded-md py-2 ${
                type === 'direct_challenge' ? 'bg-white' : ''
              }`}
            >
              <Text className={type === 'direct_challenge' ? 'font-semibold text-primary' : 'text-gray-600'}>
                Meydan oku
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setType('open_call')}
              className={`flex-1 items-center rounded-md py-2 ${
                type === 'open_call' ? 'bg-white' : ''
              }`}
            >
              <Text className={type === 'open_call' ? 'font-semibold text-primary' : 'text-gray-600'}>
                Açık ilan
              </Text>
            </Pressable>
          </View>

          <View className="mb-4 flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
            <View className="flex-1">
              <Text className="text-base font-medium text-gray-900">
                {isRated ? '🏆 Sıralama maçı' : '🤝 Dostluk maçı'}
              </Text>
              <Text className="mt-1 text-sm text-gray-600">
                {isRated ? 'ELO etkilenir' : 'ELO etkilenmez'}
              </Text>
            </View>
            <Switch value={isRated} onValueChange={setIsRated} />
          </View>

          {type === 'direct_challenge' && (
            <View className="mb-4">
              <Text className="mb-2 text-base font-semibold text-gray-900">Rakip</Text>
              <View className="max-h-64">
                <PlayerPicker selectedId={targetId} onSelect={(p) => setTargetId(p.user_id)} />
              </View>
              {errors.target && <Text className="mt-1 text-sm text-red-500">{errors.target}</Text>}
            </View>
          )}

          <RadioGroup
            label="Kategori"
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
            error={errors.category}
          />

          <FormatPicker value={format} onChange={setFormat} error={errors.format} />

          <CourtPicker value={court} onChange={setCourt} error={errors.court} />

          <DateTimeField label="Tarih" mode="date" date={date} onChange={setDate} minimumDate={minDate} error={errors.date} />
          <DateTimeField label="Saat" mode="time" date={time} onChange={setTime} error={errors.time} />

          <View className="mt-2">
            <Button onPress={onSubmit} loading={create.isPending}>
              {type === 'direct_challenge' ? 'Meydan oku' : 'İlanı yayınla'}
            </Button>
          </View>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}
