// The app's signature "crafted" surface: a rich diagonal color gradient
// (bright top-left → deep bottom-right) + a top sheen + a color-tinted glow.
//
// Composable so it works on static AND pressable cards:
//   - <GradientCard color={c}> ...</GradientCard>           // static View
//   - <Pressable style={[{overflow:'hidden',...}, glowStyle(c)]}>
//       <GradientBg color={c} /> ...content...               // tappable card
//     </Pressable>
//
// Pass a base `color`; light/deep stops derive from it (override if needed).

import { useId, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Lighten (percent > 0) or darken (percent < 0) a hex color. percent in 0..1. */
export function shade(hex: string, percent: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const target = percent < 0 ? 0 : 255;
  const p = Math.min(1, Math.abs(percent));
  r = Math.round((target - r) * p) + r;
  g = Math.round((target - g) * p) + g;
  b = Math.round((target - b) * p) + b;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Color-tinted glow shadow for a card of base `color`. Spread into style. */
export function glowStyle(color: string, opacity = 0.38): ViewStyle {
  return {
    shadowColor: shade(color, -0.12),
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: opacity,
    shadowRadius: 22,
    elevation: 10,
  };
}

interface BgProps {
  color: string;
  light?: string;
  deep?: string;
  sheen?: boolean;
}

/** Absolute-fill gradient overlay — drop inside any container with
 *  overflow:'hidden' + the base backgroundColor. Renders behind siblings. */
export function GradientBg({ color, light, deep, sheen = true }: BgProps) {
  const uid = useId().replace(/:/g, '');
  const gid = `gc-${uid}`;
  const sid = `gcs-${uid}`;
  const lightStop = light ?? shade(color, 0.28);
  const deepStop = deep ?? shade(color, -0.22);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={lightStop} stopOpacity={1} />
            <Stop offset="0.5" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={deepStop} stopOpacity={1} />
          </LinearGradient>
          <LinearGradient id={sid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={sheen ? 0.18 : 0} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${sid})`} />
      </Svg>
    </View>
  );
}

interface CardProps extends BgProps {
  children?: ReactNode;
  /** Card style (borderRadius, padding, border…). overflow:'hidden' is forced. */
  style?: ViewStyle | ViewStyle[];
  glow?: boolean;
  glowColor?: string;
}

/** Static crafted card (a View). For tappable cards use a Pressable with
 *  glowStyle(color) + <GradientBg color={color}/> instead. */
export function GradientCard({
  color,
  children,
  style,
  light,
  deep,
  sheen = true,
  glow = true,
  glowColor,
}: CardProps) {
  const glowSt: ViewStyle = glow
    ? { ...glowStyle(color), ...(glowColor ? { shadowColor: glowColor } : null) }
    : {};
  return (
    <View style={[{ backgroundColor: color, overflow: 'hidden' }, glowSt, style]}>
      <GradientBg color={color} light={light} deep={deep} sheen={sheen} />
      {children}
    </View>
  );
}
