import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

export interface ChartPoint {
  matchId: string;
  played_at: string;
  elo: number;
}

export interface ChartSeasonBoundary {
  timestamp: string;
  label: string;
}

interface Props {
  points: ChartPoint[];
  seasonBoundaries?: ChartSeasonBoundary[];
  width?: number;
  height?: number;
  onPointPress?: (matchId: string) => void;
}

export function EloHistoryChart({
  points,
  seasonBoundaries = [],
  width = 320,
  height = 200,
  onPointPress,
}: Props) {
  if (points.length === 0) return null;

  const padLeft = 36;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 24;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const elos = points.map((p) => p.elo);
  const minElo = Math.min(...elos);
  const maxElo = Math.max(...elos);
  const range = Math.max(maxElo - minElo, 1);

  const xs = points.map((_, i) =>
    points.length === 1 ? padLeft + innerW / 2 : padLeft + (i / (points.length - 1)) * innerW,
  );
  const ys = points.map((p) => padTop + (1 - (p.elo - minElo) / range) * innerH);

  const firstT = Date.parse(points[0].played_at);
  const lastT = Date.parse(points[points.length - 1].played_at);
  const tRange = Math.max(lastT - firstT, 1);

  const breakIndexes = new Set<number>();
  for (const b of seasonBoundaries) {
    const tb = Date.parse(b.timestamp);
    for (let i = 0; i < points.length - 1; i++) {
      const ti = Date.parse(points[i].played_at);
      const tj = Date.parse(points[i + 1].played_at);
      if (tb > ti && tb <= tj) breakIndexes.add(i);
    }
  }

  const segments: string[] = [];
  let current: string[] = [];
  for (let i = 0; i < points.length; i++) {
    current.push(`${xs[i]},${ys[i]}`);
    if (breakIndexes.has(i)) {
      segments.push(current.join(' '));
      current = [];
    }
  }
  if (current.length > 0) segments.push(current.join(' '));

  const visibleBoundaries = seasonBoundaries.filter((b) => {
    const tb = Date.parse(b.timestamp);
    return tb >= firstT && tb <= lastT;
  });

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + innerH} stroke="#d1d5db" />
        <Line x1={padLeft} y1={padTop + innerH} x2={padLeft + innerW} y2={padTop + innerH} stroke="#d1d5db" />
        <SvgText x={4} y={padTop + 8} fontSize="10" fill="#6b7280">{maxElo}</SvgText>
        <SvgText x={4} y={padTop + innerH} fontSize="10" fill="#6b7280">{minElo}</SvgText>

        {visibleBoundaries.map((b) => {
          const tb = Date.parse(b.timestamp);
          const x = padLeft + ((tb - firstT) / tRange) * innerW;
          return (
            <Line
              key={b.timestamp}
              x1={x}
              y1={padTop}
              x2={x}
              y2={padTop + innerH}
              stroke="#9ca3af"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          );
        })}
        {visibleBoundaries.map((b) => {
          const tb = Date.parse(b.timestamp);
          const x = padLeft + ((tb - firstT) / tRange) * innerW;
          return (
            <SvgText
              key={`${b.timestamp}-label`}
              x={x + 2}
              y={padTop + 10}
              fontSize="9"
              fill="#6b7280"
            >
              {b.label}
            </SvgText>
          );
        })}

        {segments.map((s, idx) => (
          <Polyline key={idx} points={s} fill="none" stroke="#1e3a8a" strokeWidth={2} />
        ))}
        {points.map((p, i) => (
          <Circle key={p.matchId} cx={xs[i]} cy={ys[i]} r={4} fill="#1e3a8a" />
        ))}
      </Svg>
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
        {points.map((p, i) => (
          <Pressable
            key={p.matchId}
            onPress={() => onPointPress?.(p.matchId)}
            style={{
              position: 'absolute',
              left: xs[i] - 12,
              top: ys[i] - 12,
              width: 24,
              height: 24,
            }}
          />
        ))}
      </View>
    </View>
  );
}
