// ELO history — Plan 8 Phase F3.
//
// Ports the design bundle's `EloHistory` + `EloChart` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-profile.jsx
// `function EloHistory()`, `function EloChart()`) to React Native +
// react-native-svg.
//
// The interactive scrubber sits inside the SVG itself — tapping a point
// updates `sel`; the "Maç N / 1612 ELO" footer reads from `sel`.
//
// Live data: useEloHistory(userId) per selected category.

import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Polyline, Polygon, Line } from 'react-native-svg';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Segmented } from '../../components/ui/Segmented';
import { useEloHistory, type EloPoint, type SeasonBoundary } from '../../hooks/use-elo-history';
import { useAuthStore } from '../../stores/auth-store';
import { useMyProfile } from '../../hooks/use-profile';
import { primaryCategoryOf, defaultCategoryForGender } from '../../lib/primary-category';
import { colors } from '../../theme/colors';
import { ShareSheet } from '../../components/share/ShareSheet';
import { CardEloProgress } from '../../components/share/CardEloProgress';
import { levelForElo } from '../../lib/levels';

/** Priority order for sorting categories in the segmented control. */
const CAT_ORDER = ['erkek_tek', 'kadin_tek', 'open_tek', 'erkek_cift'];

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
};

const W = 320;
const H = 150;
const PAD = 8;

function makePath(data: number[]) {
  if (data.length === 0) return { x: () => PAD, y: () => H / 2, points: '' };
  const min = data.length === 1 ? data[0] - 30 : Math.min(...data) - 30;
  const max = data.length === 1 ? data[0] + 30 : Math.max(...data) + 30;
  const range = max - min || 1;
  const x = (i: number) =>
    data.length === 1
      ? W / 2
      : PAD + (i * (W - PAD * 2)) / (data.length - 1);
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2);
  const points = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return { x, y, points };
}

/** Map season boundary timestamps to point indices in an EloPoint array. */
function seasonMarkerIndices(
  points: EloPoint[],
  boundaries: SeasonBoundary[],
): number[] {
  if (points.length === 0 || boundaries.length === 0) return [];
  return boundaries
    .map((b) => {
      const ts = new Date(b.timestamp).getTime();
      // Find the first point whose played_at >= the boundary timestamp.
      const idx = points.findIndex((p) => new Date(p.played_at).getTime() >= ts);
      return idx;
    })
    .filter((idx) => idx >= 0 && idx < points.length);
}

/** Count seasons that have a start boundary within this category's match range. */
function countSeasonsForCategory(
  points: EloPoint[],
  boundaries: SeasonBoundary[],
): number {
  if (points.length === 0) return 0;
  const first = new Date(points[0].played_at).getTime();
  const last = new Date(points[points.length - 1].played_at).getTime();
  // Count boundaries whose timestamp falls on or before the last match date.
  // We add +1 to account for the season the first match belongs to.
  const within = boundaries.filter((b) => {
    const ts = new Date(b.timestamp).getTime();
    return ts >= first && ts <= last;
  }).length;
  return within + 1;
}

export default function EloHistory() {
  const userId = useAuthStore((s) => s.user?.id);
  const profile = useAuthStore((s) => s.profile);
  // null = user hasn't made a manual selection yet; fall back to derived primaryCat.
  const [cat, setCat] = useState<string | null>(null);
  const [shareVisible, setShareVisible] = useState(false);

  const { data, isLoading, isError } = useEloHistory(userId);
  const myProfileQ = useMyProfile();
  const genderCategory = myProfileQ.data?.gender_category ?? null;

  // Derive available categories from ELO history data, sorted by priority.
  const availableCats = Object.keys(data?.byCategory ?? {}).sort(
    (a, b) =>
      (CAT_ORDER.indexOf(a) === -1 ? 999 : CAT_ORDER.indexOf(a)) -
      (CAT_ORDER.indexOf(b) === -1 ? 999 : CAT_ORDER.indexOf(b)),
  );

  // Primary category: prefer the highest-priority category the user has ELO
  // history in; fall back to gender-based default when no history yet.
  const primaryCat = primaryCategoryOf(
    availableCats.map((c) => ({ category: c })),
    defaultCategoryForGender(genderCategory),
  );

  // Effective selected category: user's explicit choice or the derived primary.
  const effectiveCat = cat ?? primaryCat;

  const catPoints: EloPoint[] = (data?.byCategory ?? {})[effectiveCat] ?? [];
  const eloValues: number[] = catPoints.map((p) => p.elo);
  const seasonBoundaries: SeasonBoundary[] = data?.seasonBoundaries ?? [];

  const seasonMarkers = seasonMarkerIndices(catPoints, seasonBoundaries);
  const seasonCount = countSeasonsForCategory(catPoints, seasonBoundaries);

  // sel index tracks selected point; reset when category changes via derived state.
  const [sel, setSel] = useState(0);
  // Clamp sel to valid range after category switch.
  const safeMax = Math.max(0, eloValues.length - 1);
  const clampedSel = Math.min(sel, safeMax);

  const { x, y, points } = makePath(eloValues);
  const current = eloValues.length > 0 ? eloValues[eloValues.length - 1] ?? 0 : 0;
  const peak = eloValues.length > 0 ? Math.max(...eloValues) : 0;
  const selValue = eloValues[clampedSel] ?? 0;

  const firstElo = eloValues.length > 0 ? eloValues[0] ?? 0 : 0;
  const totalGain = eloValues.length > 1 ? current - firstElo : 0;
  const totalGainLabel = totalGain >= 0 ? `+${totalGain}` : `${totalGain}`;

  const levelName = current > 0 ? levelForElo(current).name : '';
  const gainLabel = totalGainLabel;

  const header = (
    <NavHeader
      title="ELO Geçmişi"
      onBack={() => router.back()}
      actionIcon={eloValues.length > 0 ? 'share' : undefined}
      onAction={eloValues.length > 0 ? () => setShareVisible(true) : undefined}
    />
  );

  // Build segmented options from actual ELO-history categories; fall back to a
  // single gender-default option while data is still loading.
  const catOptions =
    availableCats.length > 0
      ? availableCats.map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c }))
      : [{ value: effectiveCat, label: CATEGORY_LABELS[effectiveCat] ?? effectiveCat }];

  const segmented = (
    <View style={{ paddingHorizontal: 18, paddingTop: 4 }}>
      <Segmented
        size="sm"
        value={effectiveCat}
        onChange={(v) => {
          setCat(v);
          setSel(0);
        }}
        options={catOptions}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        {segmented}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        {segmented}
        <View className="flex-1 items-center justify-center" style={{ padding: 24 }}>
          <Text
            className="font-sans font-semibold text-text-3"
            style={{ fontSize: 13.5, textAlign: 'center' }}
          >
            ELO geçmişi yüklenemedi. Lütfen tekrar deneyin.
          </Text>
        </View>
      </View>
    );
  }

  if (eloValues.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        {segmented}
        <View className="flex-1 items-center justify-center" style={{ padding: 24 }}>
          <Text
            className="font-sans font-semibold text-text-3"
            style={{ fontSize: 13.5, textAlign: 'center' }}
          >
            Bu kategoride henüz derecelendirme maçın yok.
          </Text>
        </View>
      </View>
    );
  }

  const catLabel = CATEGORY_LABELS[effectiveCat] ?? effectiveCat;

  return (
    <View className="flex-1 bg-bg">
      {header}
      {segmented}
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <View
          className="bg-surface rounded-lg"
          style={{
            padding: 18,
            borderWidth: 1,
            borderColor: colors.borderStrong,
          }}
        >
          <View
            className="flex-row items-end justify-between"
            style={{ marginBottom: 16 }}
          >
            <View>
              <Text
                className="font-sans font-bold text-text-3"
                style={{ fontSize: 12.5 }}
              >
                Güncel
              </Text>
              <Text
                className="font-num font-extrabold text-text"
                style={{ fontSize: 28 }}
              >
                {current}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                className="font-sans font-bold text-text-3"
                style={{ fontSize: 12.5 }}
              >
                En yüksek
              </Text>
              <Text
                className="font-num font-bold"
                style={{ fontSize: 17, color: colors.win }}
              >
                {peak}
              </Text>
            </View>
          </View>

          <Svg width={W} height={H}>
            {seasonMarkers.map((s, i) => (
              <Line
                key={i}
                x1={x(s)}
                y1={PAD}
                x2={x(s)}
                y2={H - PAD}
                stroke={colors.borderStrong}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            ))}
            {eloValues.length > 1 && (
              <Polygon
                points={`${points} ${x(eloValues.length - 1)},${H - PAD} ${x(0)},${H - PAD}`}
                fill={colors.clay}
                opacity={0.07}
              />
            )}
            <Polyline
              points={points}
              fill="none"
              stroke={colors.clay}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {eloValues.map((v, i) => (
              <Circle
                key={i}
                cx={x(i)}
                cy={y(v)}
                r={clampedSel === i ? 5 : 3}
                fill={clampedSel === i ? colors.clay : colors.surface}
                stroke={colors.clay}
                strokeWidth={2}
                onPress={() => setSel(i)}
              />
            ))}
          </Svg>

          <View
            className="flex-row justify-between"
            style={{ marginTop: 6 }}
          >
            <Text
              className="font-sans font-semibold text-text-3"
              style={{ fontSize: 11 }}
            >
              Maç {clampedSel + 1}
            </Text>
            <Text
              className="font-num font-extrabold"
              style={{ fontSize: 13, color: colors.clay }}
            >
              {selValue} ELO
            </Text>
          </View>
        </View>

        <View className="flex-row" style={{ gap: 8 }}>
          {(
            [
              [totalGainLabel, 'Toplam kazanım', totalGain >= 0 ? colors.win : colors.loss],
              [String(eloValues.length), 'Maç', colors.text],
              [String(seasonCount), 'Sezon', colors.text],
            ] as const
          ).map(([v, l, c]) => (
            <View
              key={l}
              style={{
                flex: 1,
                backgroundColor: colors.surface2,
                borderRadius: 18,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Text
                className="font-num font-extrabold"
                style={{ fontSize: 19, color: c }}
              >
                {v}
              </Text>
              <Text
                className="font-sans font-semibold text-text-3"
                style={{ fontSize: 10.5, marginTop: 2 }}
              >
                {l}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Share card sheet */}
      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        title="ELO kartını paylaş"
      >
        <CardEloProgress
          name={profile?.firstName ?? 'Sen'}
          currentElo={current}
          levelName={levelName}
          categoryLabel={catLabel}
          trend={eloValues}
          gainLabel={gainLabel}
          matchCount={eloValues.length}
        />
      </ShareSheet>
    </View>
  );
}
