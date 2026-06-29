// Skeleton — Plan 8 Phase G shimmer skeleton placeholder.
//
// Thin wrapper around Skel.tsx that exposes the canonical
//   width / height / radius / style
// API described in the Plan-8 spec, while delegating all animation and
// theming to Skel (sweep-glint driven on the UI thread via Reanimated).
//
// Use this component when you want to name props verbosely; use Skel directly
// when you prefer the shorter `w / h / r` shorthands.

import type { StyleProp, ViewStyle } from 'react-native';
import { Skel } from './Skel';

export interface SkeletonProps {
  /** Width — number (px) or a `${n}%` string. Default '100%'. */
  width?: number | `${number}%`;
  /** Height in px. Default 16. */
  height?: number;
  /** Border radius in px. Default 8. */
  radius?: number;
  /** Optional extra style merged on the container. */
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  return <Skel w={width} h={height} r={radius} style={style} />;
}
