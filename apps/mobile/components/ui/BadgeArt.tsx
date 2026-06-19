// BadgeArt — renders a player's achievement badge as crisp vector art.
//
// The designed badge set (lib/badge-art.ts) produces an SVG string per badge;
// we render it with react-native-svg's <SvgXml>. Pass the DB badge `code`
// (e.g. 'milestone_1_match'); an optional emoji `fallback` is shown for any
// code without vector art so nothing ever renders blank.

import { useMemo } from 'react';
import { Text } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { badgeSvgForCode } from '../../lib/badge-art';

interface BadgeArtProps {
  code: string;
  size?: number;
  fallback?: string;
}

export function BadgeArt({ code, size = 56, fallback }: BadgeArtProps) {
  const xml = useMemo(() => badgeSvgForCode(code, size), [code, size]);
  if (!xml) {
    return fallback ? <Text style={{ fontSize: size * 0.66 }}>{fallback}</Text> : null;
  }
  return <SvgXml xml={xml} width={size} height={size} />;
}
