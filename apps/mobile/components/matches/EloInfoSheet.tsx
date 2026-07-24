// ELO explainer — shown once on first leaderboard visit and re-openable via the
// (i) icon in the leaderboard header. Plain-language summary of how rating
// works: what earns points, what loses them, and why beating a higher-ranked
// player is worth more.

import { ScrollView, Text, View } from 'react-native';
import { Sheet } from '../ui/Sheet';
import { Icon, type IconName } from '../ui/Icon';
import { colors } from '../../theme/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const ROWS: Array<{ icon: IconName; color: string; title: string; body: string }> = [
  {
    icon: 'trophy',
    color: colors.win,
    title: 'Kazanınca puan alırsın',
    body: 'Her sıralama maçı ELO puanını değiştirir. Kazanan puan kazanır, kaybeden puan kaybeder — toplam sıfır.',
  },
  {
    icon: 'flame',
    color: colors.clay,
    title: 'Güçlü rakip daha çok puan',
    body: 'Senden üst sıradaki (yüksek ELO) birini yenmek, alt sıradaki birini yenmekten daha fazla puan getirir. Sürpriz galibiyet daha değerli.',
  },
  {
    icon: 'bolt',
    color: colors.court,
    title: 'Farklı kazanmak da önemli',
    body: 'Skor farkı büyükse (örn. Klasik 4-0) puan çarpanı artar. Çekişmeli biten maç (4-3) daha az puan oynatır.',
  },
  {
    icon: 'spark',
    color: colors.acPurple,
    title: 'Yeni oyuncu daha hızlı oturur',
    body: 'İlk 10 maçında puanın daha hızlı değişir, böylece gerçek seviyene çabuk ulaşırsın. Sonra oynaklık azalır.',
  },
];

export function EloInfoSheet({ visible, onClose }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose} title="ELO nasıl çalışır?">
      <ScrollView
        style={{ maxHeight: 440 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="font-sans text-text-2"
          style={{ fontSize: 13.5, lineHeight: 20 }}
        >
          ELO, oyuncuların gücünü tek bir puanda toplayan bir sıralama
          sistemidir. Herkes 1200 ile başlar.
        </Text>

        {ROWS.map((r) => (
          <View
            key={r.title}
            className="flex-row rounded-lg"
            style={{
              gap: 12,
              padding: 13,
              backgroundColor: colors.surface2,
              borderWidth: 1,
              borderColor: colors.surface3,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: `${r.color}1F`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={r.icon} size={19} color={r.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                className="font-sans font-bold text-text"
                style={{ fontSize: 14.5 }}
              >
                {r.title}
              </Text>
              <Text
                className="font-sans text-text-2"
                style={{ fontSize: 13, lineHeight: 19, marginTop: 2 }}
              >
                {r.body}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}
