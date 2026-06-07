import { Modal, ScrollView, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import type { MatchFormat } from './FormatPicker';

interface Props {
  visible: boolean;
  format: MatchFormat;
  onAcknowledge: () => void;
}

const RULES: Record<MatchFormat, { title: string; bullets: string[] }> = {
  bu_klasik: {
    title: 'BÜ Klasik (~60 dk)',
    bullets: [
      'Maç en fazla 1 saat sürer.',
      'İlk 4 eli kazanan maçı alır.',
      'Sayılar 15 / 30 / 40 / avantaj olarak sayılır (klasik tenis sayımı).',
      '3-3 olursa "Maçı Bitir" butonuna basın — maç yapılmamış sayılır, ELO etkilenmez.',
      'Her el sonunda her iki oyuncu da aynı skoru girmek zorundadır.',
    ],
  },
  hizli_tiebreak: {
    title: 'Hızlı Tiebreak (~20 dk)',
    bullets: [
      'Sadece bir adet 10 sayılık match tiebreak oynanır.',
      '10 sayıya ilk ulaşan ve en az 2 sayı farkı olan kazanır.',
      '9-9 olursa 2 sayı farkı sağlanana kadar uzar.',
    ],
  },
  pro_set_8: {
    title: 'Pro Set 8 (~75 dk)',
    bullets: [
      'Game bazında oynanır (klasik tenis sayımı).',
      'İlk 8 game alan kazanır (8-6 veya daha fazla fark).',
      '6-6 olursa kim 8\'e gelirse maçı alır.',
      '8-8 olursa 7 sayılık tiebreak oynanır.',
    ],
  },
  '3set_klasik': {
    title: '3 Set Klasik (~2 saat)',
    bullets: [
      'ATP standardı: ilk 2 seti alan maçı alır.',
      'Her set 6 game (2 game farkla).',
      '6-6 olursa tiebreak (7 sayılık).',
      'Sayılar 15 / 30 / 40 / avantaj olarak sayılır.',
    ],
  },
};

export function FormatRulesModal({ visible, format, onAcknowledge }: Props) {
  const rules = RULES[format] ?? { title: 'Bilinmeyen format', bullets: ['Format kuralları tanımlı değil.'] };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white p-6">
        <Text className="mb-4 text-2xl font-bold text-gray-900">{rules.title}</Text>
        <ScrollView className="flex-1">
          {rules.bullets.map((b, i) => (
            <View key={i} className="mb-3 flex-row gap-2">
              <Text className="text-base text-primary">•</Text>
              <Text className="flex-1 text-base text-gray-800">{b}</Text>
            </View>
          ))}
        </ScrollView>
        <View className="mt-4">
          <Button onPress={onAcknowledge}>Anladım, başla</Button>
        </View>
      </View>
    </Modal>
  );
}
