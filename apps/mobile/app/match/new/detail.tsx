// apps/mobile/app/match/new/detail.tsx — Plan 8 Phase E12.
//
// Step 3 of "Yeni Maç" — picks Kategori / Format / Tarih / Saat / Kort
// via five Selector rows that open their own bottom Sheets. Ports
// `NewMatchDetail` from
//   docs/superpowers/specs/plan-8-design-bundle/project/app/screens-match-flow.jsx
// `function NewMatchDetail(...)`.
//
// Sheets reuse the `Sheet` primitive (one visibility flag selects which
// of the five inline Sheets is open). Lists (DAYS, TIMES, COURTS) are
// static placeholders for now — a later Phase E polish will swap them
// for live data sources (courts table + season-aware date suggestions).

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Sheet } from '../../../components/ui/Sheet';
import { Button } from '../../../components/ui/Button';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { FORMATS } from '../../../lib/formats';
import {
  useNewMatchStore,
  type CategoryKey,
} from '../../../stores/new-match-store';
import { colors } from '../../../theme/colors';

interface CategoryDef {
  key: CategoryKey;
  label: string;
  group: 'tek' | 'cift';
}

const CATEGORIES: CategoryDef[] = [
  { key: 'erkek_tek', label: 'Erkek Tek', group: 'tek' },
  { key: 'kadin_tek', label: 'Kadın Tek', group: 'tek' },
  { key: 'open_tek', label: 'Open Tek', group: 'tek' },
  { key: 'erkek_cift', label: 'Erkek Çift', group: 'cift' },
  { key: 'kadin_cift', label: 'Kadın Çift', group: 'cift' },
  { key: 'karma_cift', label: 'Karma Çift', group: 'cift' },
  { key: 'open_cift', label: 'Open Çift', group: 'cift' },
];

const DAYS = ['Bugün', 'Yarın', '8 Haz Paz', '9 Haz Pzt', '10 Haz Sal', '11 Haz Çar'];
const TIMES = ['10:00', '12:00', '14:00', '16:00', '18:30', '20:00', '21:30'];
// TODO(plan-8-E-polish): drive from real `courts` table once available.
const COURTS = ['Kort 1', 'Kort 2', 'Bebek Kort', 'Hisar Kort'];

type SheetKey = 'cat' | 'fmt' | 'date' | 'time' | 'court';

interface SelectorProps {
  label: string;
  value: string;
  icon: IconName;
  onPress: () => void;
}

function Selector({ label, value, icon, onPress }: SelectorProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center bg-surface rounded-md"
      style={{
        width: '100%',
        height: 54,
        paddingHorizontal: 16,
        gap: 12,
        borderWidth: 1.5,
        borderColor: colors.borderStrong,
      }}
    >
      <Icon name={icon} size={20} color={colors.text3} />
      <View style={{ flex: 1 }}>
        <Text
          className="font-sans font-bold text-text-3"
          style={{ fontSize: 11.5 }}
        >
          {label}
        </Text>
        <Text
          className="font-sans font-bold text-text"
          style={{ fontSize: 15 }}
        >
          {value}
        </Text>
      </View>
      <Icon name="chevD" size={18} color={colors.text3} />
    </Pressable>
  );
}

export default function NewMatchDetail() {
  const { category, format, date, time, court, setField, path } =
    useNewMatchStore();
  const [openSheet, setOpenSheet] = useState<SheetKey | null>(null);

  const cat = CATEGORIES.find((c) => c.key === category)!;
  const fmt = FORMATS.find((f) => f.key === format)!;
  const isDoubles = cat.group === 'cift';

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Maç detayları" onBack={() => router.back()} />
      <View style={{ flex: 1, padding: 18, gap: 12 }}>
        <Selector
          label="Kategori"
          value={cat.label}
          icon="ranking"
          onPress={() => setOpenSheet('cat')}
        />
        <Selector
          label="Format"
          value={`${fmt.name} · ${fmt.tag}`}
          icon={fmt.mark}
          onPress={() => setOpenSheet('fmt')}
        />
        <View className="flex-row" style={{ gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Selector
              label="Tarih"
              value={date}
              icon="calendar"
              onPress={() => setOpenSheet('date')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Selector
              label="Saat"
              value={time}
              icon="clock"
              onPress={() => setOpenSheet('time')}
            />
          </View>
        </View>
        <Selector
          label="Kort"
          value={court}
          icon="pin"
          onPress={() => setOpenSheet('court')}
        />

        {/* Info banner — singles vs doubles preview of next step. */}
        <View
          className="flex-row bg-surface-2 rounded-md"
          style={{ marginTop: 4, padding: 13, gap: 10 }}
        >
          <Icon name="info" size={17} color={colors.info} />
          <Text
            className="font-sans text-text-2"
            style={{ flex: 1, fontSize: 12.5, lineHeight: 19 }}
          >
            {isDoubles
              ? 'Çift maçı — sıradaki adımda partner ve rakip çifti seçeceksin.'
              : 'Tek maçı — sıradaki adımda rakibini seçeceksin.'}
          </Text>
        </View>
      </View>
      <View style={{ padding: 18 }}>
        <Button
          full
          size="lg"
          onPress={() => router.push('/match/new/opponent' as never)}
        >
          {path === 'open' ? 'İlan detayına geç' : 'Rakip seç'}
        </Button>
      </View>

      {/* Category sheet — 2-col grid, clay outline on selection. */}
      <Sheet
        visible={openSheet === 'cat'}
        onClose={() => setOpenSheet(null)}
        title="Kategori seç"
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((c) => {
            const on = c.key === category;
            return (
              <Pressable
                key={c.key}
                onPress={() => {
                  setField('category', c.key);
                  setOpenSheet(null);
                }}
                style={{
                  width: '48%',
                  paddingVertical: 14,
                  paddingHorizontal: 10,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: on ? colors.clay : colors.borderStrong,
                  backgroundColor: on ? colors.claySofter : colors.surface,
                  alignItems: 'center',
                }}
              >
                <Text
                  className="font-sans font-bold text-text"
                  style={{ fontSize: 14 }}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* Format sheet — per-format brand color outlines selection. */}
      <Sheet
        visible={openSheet === 'fmt'}
        onClose={() => setOpenSheet(null)}
        title="Format seç"
      >
        <View style={{ gap: 10 }}>
          {FORMATS.map((f) => {
            const on = f.key === format;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  setField('format', f.key);
                  setOpenSheet(null);
                }}
                style={{
                  padding: 14,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: on ? f.color : colors.borderStrong,
                  backgroundColor: on ? `${f.color}14` : colors.surface,
                }}
              >
                <View
                  className="flex-row items-center"
                  style={{ gap: 10 }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 14,
                      backgroundColor: `${f.color}24`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={f.mark} size={19} color={f.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      className="font-sans font-extrabold text-text"
                      style={{ fontSize: 15.5 }}
                    >
                      {f.name}{' '}
                      <Text style={{ fontSize: 12, color: f.color }}>
                        · {f.tag}
                      </Text>
                    </Text>
                  </View>
                  {on && (
                    <Icon name="check" size={18} color={f.color} stroke={3} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* Date sheet — vertical list of day labels. */}
      <Sheet
        visible={openSheet === 'date'}
        onClose={() => setOpenSheet(null)}
        title="Tarih seç"
      >
        {DAYS.map((d) => (
          <Pressable
            key={d}
            onPress={() => {
              setField('date', d);
              setOpenSheet(null);
            }}
            style={{
              width: '100%',
              padding: 15,
              paddingHorizontal: 8,
              borderBottomWidth: 1,
              borderColor: colors.surface3,
            }}
          >
            <Text
              className="font-sans font-bold text-text"
              style={{ fontSize: 15 }}
            >
              {d}
            </Text>
          </Pressable>
        ))}
      </Sheet>

      {/* Time sheet — 3-col grid of 24h slots. */}
      <Sheet
        visible={openSheet === 'time'}
        onClose={() => setOpenSheet(null)}
        title="Saat seç"
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TIMES.map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                setField('time', t);
                setOpenSheet(null);
              }}
              style={{
                width: '31%',
                padding: 14,
                paddingHorizontal: 4,
                alignItems: 'center',
                borderRadius: 18,
                borderWidth: 1.5,
                borderColor: colors.borderStrong,
                backgroundColor: colors.surface,
              }}
            >
              <Text
                className="font-num font-bold text-text"
                style={{ fontSize: 15 }}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      </Sheet>

      {/* Court sheet — list rows with pin + check. */}
      <Sheet
        visible={openSheet === 'court'}
        onClose={() => setOpenSheet(null)}
        title="Kort seç"
      >
        {COURTS.map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              setField('court', c);
              setOpenSheet(null);
            }}
            className="flex-row items-center"
            style={{
              width: '100%',
              paddingVertical: 15,
              paddingHorizontal: 8,
              gap: 12,
              borderBottomWidth: 1,
              borderColor: colors.borderStrong,
            }}
          >
            <Icon name="pin" size={20} color={colors.clay} />
            <Text
              className="font-sans font-bold text-text"
              style={{ flex: 1, fontSize: 15 }}
            >
              {c}
            </Text>
            {court === c && (
              <Icon name="check" size={18} color={colors.clay} stroke={3} />
            )}
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}
