// ELO history — Plan 8 Phase F3.
//
// Premium chart upgrade: responsive width, Catmull-Rom smooth line,
// gradient area fill, strokeDashoffset draw-on animation (reanimated),
// interactive floating tooltip on scrub.
//
// Animation approach: `drawProgress` SharedValue (0→1) drives both
// the line's strokeDashoffset (pathLen→0) and the fill's fillOpacity
// (0→1) via `useAnimatedProps`. A `useEffect` on `[effectiveCat,
// eloValues.length]` resets progress to 0 and re-triggers `withTiming`
// so the chart redraws whenever the category changes or data loads.
// `pathLenSV` is a SharedValue that mirrors the JS-side `pathLen` so
// the worklet always reads the correct chord length.
//
// Data and logic unchanged: useEloHistory, category logic, stats row,
// share sheet are identical to the original.

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Segmented } from '../../components/ui/Segmented';
import {
  useEloHistory,
  type EloPoint,
  type SeasonBoundary,
} from '../../hooks/use-elo-history';
import { useAuthStore } from '../../stores/auth-store';
import { useMyProfile } from '../../hooks/use-profile';
import {
  primaryCategoryOf,
  defaultCategoryForGender,
} from '../../lib/primary-category';
import { colors } from '../../theme/colors';
import { ShareSheet } from '../../components/share/ShareSheet';
import { CardEloProgress } from '../../components/share/CardEloProgress';
import { levelForElo } from '../../lib/levels';

// AnimatedPath must be created outside the component so
// Animated.createAnimatedComponent runs only once (mirrors LevelRing pattern).
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── constants ───────────────────────────────────────────────────────────────

/** Priority order for sorting categories in the segmented control. */
const CAT_ORDER = ['erkek_tek', 'kadin_tek', 'open_tek', 'erkek_cift'];

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
};

const H = 160;   // chart height (px)
const PAD = 10;  // inset padding inside the chart

const TOOLTIP_W = 90;
const TOOLTIP_H = 44;

// ─── geometry helpers ────────────────────────────────────────────────────────

interface Pt { x: number; y: number }

/** Convert ELO values to chart-space {x, y} coordinates. */
function makePts(data: number[], w: number): Pt[] {
  if (data.length === 0) return [];
  const min = data.length === 1 ? data[0] - 30 : Math.min(...data) - 30;
  const max = data.length === 1 ? data[0] + 30 : Math.max(...data) + 30;
  const range = max - min || 1;
  return data.map((v, i) => ({
    x:
      data.length === 1
        ? w / 2
        : PAD + (i * (w - PAD * 2)) / (data.length - 1),
    y: H - PAD - ((v - min) / range) * (H - PAD * 2),
  }));
}

/**
 * Catmull-Rom → cubic bezier SVG path.
 * Uses the standard alpha=0.5 tension so curves pass through every point
 * without overshooting (faithful to the underlying ELO values).
 */
function smoothLinePath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  if (pts.length === 2)
    return `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)} L${pts[1].x.toFixed(2)},${pts[1].y.toFixed(2)}`;

  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

/** Area fill path: smoothed line closed along the bottom baseline. */
function makeAreaPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  const line = smoothLinePath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${line} L${last.x.toFixed(2)},${(H - PAD).toFixed(2)} L${first.x.toFixed(2)},${(H - PAD).toFixed(2)} Z`;
}

/**
 * Approximate total path length (chord-length sum + 25% buffer for bezier
 * curvature). Used as the strokeDasharray value for the draw-on animation.
 */
function approxPathLen(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len * 1.25;
}

// ─── season helpers ───────────────────────────────────────────────────────────

function seasonMarkerIndices(
  points: EloPoint[],
  boundaries: SeasonBoundary[],
): number[] {
  if (points.length === 0 || boundaries.length === 0) return [];
  return boundaries
    .map((b) => {
      const ts = new Date(b.timestamp).getTime();
      const idx = points.findIndex(
        (p) => new Date(p.played_at).getTime() >= ts,
      );
      return idx;
    })
    .filter((idx) => idx >= 0 && idx < points.length);
}

function countSeasonsForCategory(
  points: EloPoint[],
  boundaries: SeasonBoundary[],
): number {
  if (points.length === 0) return 0;
  const first = new Date(points[0].played_at).getTime();
  const last = new Date(points[points.length - 1].played_at).getTime();
  const within = boundaries.filter((b) => {
    const ts = new Date(b.timestamp).getTime();
    return ts >= first && ts <= last;
  }).length;
  return within + 1;
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function EloHistory() {
  const { width: screenWidth } = useWindowDimensions();
  // Card sits inside ScrollView (padding 18) + card (padding 18) on each side.
  const chartW = Math.max(100, screenWidth - 72);

  const userId = useAuthStore((s) => s.user?.id);
  const profile = useAuthStore((s) => s.profile);
  const [cat, setCat] = useState<string | null>(null);
  const [shareVisible, setShareVisible] = useState(false);

  const { data, isLoading, isError } = useEloHistory(userId);
  const myProfileQ = useMyProfile();
  const genderCategory = myProfileQ.data?.gender_category ?? null;

  const availableCats = Object.keys(data?.byCategory ?? {}).sort(
    (a, b) =>
      (CAT_ORDER.indexOf(a) === -1 ? 999 : CAT_ORDER.indexOf(a)) -
      (CAT_ORDER.indexOf(b) === -1 ? 999 : CAT_ORDER.indexOf(b)),
  );

  const primaryCat = primaryCategoryOf(
    availableCats.map((c) => ({ category: c })),
    genderCategory,
    defaultCategoryForGender(genderCategory),
  );

  const effectiveCat = cat ?? primaryCat;

  const catPoints: EloPoint[] = (data?.byCategory ?? {})[effectiveCat] ?? [];
  const eloValues: number[] = catPoints.map((p) => p.elo);
  const seasonBoundaries: SeasonBoundary[] = data?.seasonBoundaries ?? [];

  const seasonMarkers = seasonMarkerIndices(catPoints, seasonBoundaries);
  const seasonCount = countSeasonsForCategory(catPoints, seasonBoundaries);

  const [sel, setSel] = useState(0);
  const safeMax = Math.max(0, eloValues.length - 1);
  const clampedSel = Math.min(sel, safeMax);

  // ── geometry ──
  const pts = makePts(eloValues, chartW);
  const linePath = smoothLinePath(pts);
  const fillPath = makeAreaPath(pts);
  const pathLen = pts.length > 1 ? approxPathLen(pts) : 1;

  // ── animation ──
  // pathLenSV keeps the worklet in sync with the JS-side pathLen across
  // category changes (SharedValue avoids stale closure in useAnimatedProps).
  const pathLenSV = useSharedValue(pathLen);
  const drawProgress = useSharedValue(0);

  useEffect(() => {
    if (eloValues.length === 0) return;
    pathLenSV.value = pathLen;
    drawProgress.value = 0;
    drawProgress.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
    // pathLenSV / drawProgress are stable SharedValue refs — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCat, eloValues.length]);

  // strokeDashoffset: pathLen (hidden) → 0 (fully drawn)
  const animatedLineProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLenSV.value * (1 - drawProgress.value),
  }));

  // area fill fades in alongside the line draw
  const animatedFillProps = useAnimatedProps(() => ({
    fillOpacity: interpolate(drawProgress.value, [0, 1], [0, 1]),
  }));

  // ── derived display values ──
  const current = eloValues.length > 0 ? eloValues[eloValues.length - 1] ?? 0 : 0;
  const peak = eloValues.length > 0 ? Math.max(...eloValues) : 0;
  const selValue = eloValues[clampedSel] ?? 0;
  const selPoint = catPoints[clampedSel];
  const selDate = selPoint
    ? new Date(selPoint.played_at).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
      })
    : '';

  const firstElo = eloValues.length > 0 ? eloValues[0] ?? 0 : 0;
  const totalGain = eloValues.length > 1 ? current - firstElo : 0;
  const totalGainLabel = totalGain >= 0 ? `+${totalGain}` : `${totalGain}`;

  const levelName = current > 0 ? levelForElo(current).name : '';
  const gainLabel = totalGainLabel;

  // ── tooltip position ──
  const selPt = pts[clampedSel];
  const tooltipLeft = selPt
    ? Math.max(0, Math.min(selPt.x - TOOLTIP_W / 2, chartW - TOOLTIP_W))
    : 0;
  const tooltipTop = selPt
    ? Math.max(PAD + 2, selPt.y - TOOLTIP_H - 10)
    : 0;

  // ── shared chrome ──
  const header = (
    <NavHeader
      title="ELO Geçmişi"
      onBack={() => router.back()}
      actionIcon={eloValues.length > 0 ? 'share' : undefined}
      onAction={eloValues.length > 0 ? () => setShareVisible(true) : undefined}
    />
  );

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

  // ── early returns (all hooks already called above) ──

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
        {/* ── main chart card ── */}
        <View
          className="bg-surface rounded-lg"
          style={{ padding: 18, borderWidth: 1, borderColor: colors.borderStrong }}
        >
          {/* Header: current ELO / peak */}
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

          {/* Chart container — tooltip is absolutely positioned inside */}
          <View style={{ width: chartW, height: H }}>
            <Svg width={chartW} height={H}>
              <Defs>
                {/* Vertical gradient: lime tint at top, transparent at baseline */}
                <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.lime} stopOpacity={0.2} />
                  <Stop offset="1" stopColor={colors.lime} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {/* Faint baseline */}
              <Line
                x1={PAD}
                y1={H - PAD}
                x2={chartW - PAD}
                y2={H - PAD}
                stroke={colors.borderStrong}
                strokeOpacity={0.08}
                strokeWidth={1}
              />

              {/* Season boundary dashed verticals */}
              {seasonMarkers.map((s, i) => {
                const bx = pts[s]?.x ?? 0;
                return (
                  <Line
                    key={i}
                    x1={bx}
                    y1={PAD}
                    x2={bx}
                    y2={H - PAD}
                    stroke={colors.borderStrong}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    strokeOpacity={0.3}
                  />
                );
              })}

              {/* Gradient area fill — fades in with the draw animation */}
              {pts.length > 1 && (
                <AnimatedPath
                  d={fillPath}
                  fill="url(#areaGrad)"
                  animatedProps={animatedFillProps}
                />
              )}

              {/* Smooth line — draws left→right via strokeDashoffset */}
              {pts.length > 1 && (
                <AnimatedPath
                  d={linePath}
                  fill="none"
                  stroke={colors.clay}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={pathLen}
                  animatedProps={animatedLineProps}
                />
              )}

              {/* Single-point fallback */}
              {pts.length === 1 && pts[0] != null && (
                <Circle cx={pts[0].x} cy={pts[0].y} r={4} fill={colors.clay} />
              )}

              {/* Dashed vertical guide at selected point */}
              {pts.length > 1 && selPt != null && (
                <Line
                  x1={selPt.x}
                  y1={PAD}
                  x2={selPt.x}
                  y2={H - PAD}
                  stroke={colors.clay}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  strokeOpacity={0.18}
                />
              )}

              {/* Dots + tap targets */}
              {pts.map((pt, i) => (
                <Circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={clampedSel === i ? 5.5 : 3}
                  fill={clampedSel === i ? colors.clay : colors.surface}
                  stroke={colors.clay}
                  strokeWidth={clampedSel === i ? 0 : 1.5}
                  onPress={() => setSel(i)}
                />
              ))}
            </Svg>

            {/* Floating tooltip — positioned near the active dot */}
            {selPt != null && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: tooltipLeft,
                  top: tooltipTop,
                  width: TOOLTIP_W,
                  height: TOOLTIP_H,
                  backgroundColor: colors.clay,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  justifyContent: 'center',
                }}
              >
                {selDate.length > 0 && (
                  <Text
                    className="font-sans font-semibold"
                    style={{
                      fontSize: 9.5,
                      color: 'rgba(255,255,255,0.55)',
                      marginBottom: 1,
                    }}
                    numberOfLines={1}
                  >
                    {selDate}
                  </Text>
                )}
                <Text
                  className="font-num font-extrabold"
                  style={{ fontSize: 14, color: colors.bg, lineHeight: 17 }}
                  numberOfLines={1}
                >
                  {selValue} ELO
                </Text>
              </View>
            )}
          </View>

          {/* Scrubber label row */}
          <View className="flex-row justify-between" style={{ marginTop: 8 }}>
            <Text
              className="font-sans font-semibold text-text-3"
              style={{ fontSize: 11 }}
            >
              Maç {clampedSel + 1} / {eloValues.length}
            </Text>
            <Text
              className="font-num font-extrabold"
              style={{ fontSize: 13, color: colors.clay }}
            >
              {selValue} ELO
            </Text>
          </View>
        </View>

        {/* ── 3-stat row ── */}
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
