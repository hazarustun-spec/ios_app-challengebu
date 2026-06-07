import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

export interface ChartPoint {
  matchId: string;
  played_at: string;
  elo: number;
}

interface Props {
  points: ChartPoint[];
  width?: number;
  height?: number;
  onPointPress?: (matchId: string) => void;
}

export function EloHistoryChart({ points, width = 320, height = 200, onPointPress }: Props) {
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

  const polylinePoints = xs.map((x, i) => `${x},${ys[i]}`).join(' ');

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + innerH} stroke="#d1d5db" />
        <Line x1={padLeft} y1={padTop + innerH} x2={padLeft + innerW} y2={padTop + innerH} stroke="#d1d5db" />
        <SvgText x={4} y={padTop + 8} fontSize="10" fill="#6b7280">{maxElo}</SvgText>
        <SvgText x={4} y={padTop + innerH} fontSize="10" fill="#6b7280">{minElo}</SvgText>
        <Polyline points={polylinePoints} fill="none" stroke="#1e3a8a" strokeWidth={2} />
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
