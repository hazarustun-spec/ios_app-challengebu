// RankBadge — renders a player's rank (level) medallion as crisp vector art.
//
// The designed rank set (lib/rank-art.ts) provides one SVG per tier; we render
// it with react-native-svg's <SvgXml>. Pass a level identifier from either
// scheme — mobile `lib/levels` key (e.g. 'rekabet') or `@tennis/shared`
// LevelCode (e.g. 'rekabetci'). Aspect ratio is fixed at 320:430 (portrait,
// medallion + name banner); `size` sets the width.

import { useMemo } from 'react';
import { Text } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { rankSvg, RANK_ASPECT } from '../../lib/rank-art';

interface RankBadgeProps {
  /** Level key/code (cekirge, rekabet, yeni_cekirge, rekabetci, …). */
  level: string;
  /** Rendered width in pt; height = size × 430/320. */
  size?: number;
  /** Emoji shown if no vector art exists for the level. */
  fallback?: string;
}

export function RankBadge({ level, size = 120, fallback }: RankBadgeProps) {
  const xml = useMemo(() => rankSvg(level), [level]);
  if (!xml) {
    return fallback ? <Text style={{ fontSize: size * 0.5 }}>{fallback}</Text> : null;
  }
  return <SvgXml xml={xml} width={size} height={size * RANK_ASPECT} />;
}
