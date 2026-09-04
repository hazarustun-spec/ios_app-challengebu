// apps/mobile/app/match/new/detail.tsx — Plan 8 Phase E12.
//
// Step 3 of "Yeni Maç" — picks Kategori / Format / Tarih / Saat / Kort
// via five Selector rows that open their own bottom Sheets. Ports
// `NewMatchDetail` from
//   docs/superpowers/specs/plan-8-design-bundle/project/app/screens-match-flow.jsx
// `function NewMatchDetail(...)`.
//
// Sheets reuse the `Sheet` primitive (one visibility flag selects which
// of the five inline Sheets is open). The date picker offers the next 10
// days (lib/match-dates.nextDays) and STORES the ISO value the API needs
// while displaying a friendly Turkish label; TIMES stay as preset slots.
// The court list is wired live via useCourts() and stores the court UUID
// (the first active court is auto-selected so a valid id is always sent).

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Sheet } from '../../../components/ui/Sheet';
import { Button } from '../../../components/ui/Button';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { FORMATS } from '../../../lib/formats';
import { formatDateLabel, nextDays, toIso } from '../../../lib/match-dates';
import {
  useNewMatchStore,
  type CategoryKey,
} from '../../../stores/new-match-store';
import { useCourts } from '../../../hooks/use-courts';
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
  // 'karma_cift' retired in 20260805000002 — nothing enforced the one-man-
  // one-woman rule that would have distinguished it from Open Çift, so the
  // two categories were the same ladder twice over. Open Çift is the survivor.
  { key: 'open_cift', label: 'Open Çift', group: 'cift' },
];

// Hourly court slots, 09:00–20:00.
const TIMES = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

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
  const courtsQuery = useCourts();
  const courts = courtsQuery.data ?? [];

  // Upcoming days (today + next 9), recomputed once per mount so the picker
  // never shows stale calendar dates.
  const days = useMemo(() => nextDays(10), []);

  // Default the court to the first active one as soon as the list loads, so a
  // valid court UUID is always submitted even if the user skips the sheet.
  useEffect(() => {
    if (!court && courts.length > 0) setField('court', courts[0].id);
  }, [court, courts, setField]);

  // When the chosen date is today, hide slots that are already in the past.
  const availableTimes = useMemo(() => {
    if (date !== toIso(new Date())) return TIMES;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return TIMES.filter((t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m > nowMin;
    });
  }, [date]);

  // If the stored time fell into the past (e.g. the date switched to today),
  // snap it to the first still-valid slot so we never submit a past kickoff.
  useEffect(() => {
    if (time && !availableTimes.includes(time)) {
      setField('time', availableTimes[0] ?? '');
    }
  }, [availableTimes, time, setField]);

  // Defensive lookups — a persisted wizard draft can hold a retired category
  // (e.g. `karma_cift`, dropped in 20260805000002) or a format that no longer
  // ships. Falling through to `!` used to crash the screen. Fall back to the
  // first valid option and self-heal the store on the next tick.
  const catFound = CATEGORIES.find((c) => c.key === category);
  const cat = catFound ?? CATEGORIES[0]!;
  const fmtFound = FORMATS.find((f) => f.key === format);
  const fmt = fmtFound ?? FORMATS[0]!;
  useEffect(() => {
    if (!catFound) setField('category', CATEGORIES[0]!.key);
  }, [catFound, setField]);
  useEffect(() => {
    if (!fmtFound) setField('format', FORMATS[0]!.key);
  }, [fmtFound, setField]);
  const isDoubles = cat.group === 'cift';
  const courtName =
    courts.find((c) => c.id === court)?.name ?? 'Kort seç';

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
              value={formatDateLabel(date)}
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
          value={courtName}
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
              ? path === 'open'
                ? 'Çift maçı — açık ilan. Sıradaki adımda partnerini seçeceksin.'
                : 'Çift maçı — sıradaki adımda partner ve rakip çiftini seçeceksin.'
              : 'Tek maçı — sıradaki adımda rakibini seçeceksin.'}
          </Text>
        </View>
      </View>
      <View style={{ padding: 18 }}>
        <Button
          full
          size="lg"
          disabled={!court || !time || !date}
          onPress={() => {
            if (path === 'open') {
              // Open calls have no specific target — clear any stale opponent/
              // opponentPartner and either skip to preview (singles) or go to
              // the partner-picker step (doubles).
              setField('opponent', null);
              setField('opponentPartner', null);
              if (isDoubles) {
                // Doubles open call: creator must still pick their partner.
                router.push('/match/new/opponent' as never);
              } else {
                router.push('/match/new/preview' as never);
              }
            } else {
              router.push('/match/new/opponent' as never);
            }
          }}
        >
          {path === 'open' && isDoubles
            ? 'Partner seç'
            : path === 'open'
              ? 'İlanı önizle'
              : 'Rakip seç'}
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
              <View
                key={f.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: on ? f.color : colors.borderStrong,
                  backgroundColor: on ? `${f.color}14` : colors.surface,
                }}
              >
                <Pressable
                  onPress={() => {
                    setField('format', f.key);
                    setOpenSheet(null);
                  }}
                  className="flex-row items-center"
                  style={{ flex: 1, gap: 10 }}
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
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/match/new/format-rules?format=${f.key}` as never)}
                  hitSlop={10}
                  style={{ paddingLeft: 10 }}
                >
                  <Icon name="info" size={18} color={colors.text3} />
                </Pressable>
              </View>
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
        {days.map((d) => (
          <Pressable
            key={d.iso}
            onPress={() => {
              setField('date', d.iso);
              setOpenSheet(null);
            }}
            className="flex-row items-center justify-between"
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
              {d.label}
            </Text>
            {date === d.iso && (
              <Icon name="check" size={18} color={colors.clay} stroke={3} />
            )}
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
          {availableTimes.length === 0 && (
            <Text
              className="font-sans text-text-3"
              style={{ fontSize: 13.5, paddingVertical: 8 }}
            >
              Bugün için uygun saat kalmadı — başka bir gün seç.
            </Text>
          )}
          {availableTimes.map((t) => (
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

      {/* Court sheet — list rows with pin + check. Live data from useCourts(). */}
      <Sheet
        visible={openSheet === 'court'}
        onClose={() => setOpenSheet(null)}
        title="Kort seç"
      >
        {courtsQuery.isLoading ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator color={colors.clay} />
          </View>
        ) : courtsQuery.isError ? (
          <View style={{ paddingVertical: 16, paddingHorizontal: 8 }}>
            <Text
              className="font-sans text-text-3"
              style={{ fontSize: 13.5, textAlign: 'center' }}
            >
              Kortlar yüklenemedi. Lütfen tekrar dene.
            </Text>
          </View>
        ) : (courtsQuery.data ?? []).length === 0 ? (
          <View style={{ paddingVertical: 16, paddingHorizontal: 8 }}>
            <Text
              className="font-sans text-text-3"
              style={{ fontSize: 13.5, textAlign: 'center' }}
            >
              Aktif kort bulunamadı.
            </Text>
          </View>
        ) : (
          courts.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => {
                setField('court', c.id);
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
                {c.name}
              </Text>
              {court === c.id && (
                <Icon name="check" size={18} color={colors.clay} stroke={3} />
              )}
            </Pressable>
          ))
        )}
      </Sheet>
    </View>
  );
}
