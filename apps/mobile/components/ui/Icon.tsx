// Icon primitive — Plan 8 Phase C2.
//
// Ports the design bundle's `Icon` component + named SVG path registry
// from
//   docs/superpowers/specs/plan-8-design-bundle/project/app/icons.jsx
// to React Native + react-native-svg.
//
// The original design renders icons via `dangerouslySetInnerHTML` of an
// inline `<svg>` element; here we translate every `d`/`<circle>`/`<rect>`
// shape into the matching react-native-svg primitive so the icons render
// natively (and stay typesafe).
//
// Default size = 24 (matches the Plan 8 component spec). Color defaults to
// `colors.text` (ink), stroke width defaults to 2 — same baseline the
// original `Icon` function shipped with.
//
// Consumers: Button (icon / iconRight / arrow), Field (leading + suffix),
// Banner, Toast, ListRow, NavHeader, MatchCard, EmptyState, … virtually
// every other primitive needs Icon.

import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';

// ---------------------------------------------------------------------------
// Icon registry
// ---------------------------------------------------------------------------
//
// Each entry is a thunk that yields the child SVG elements. Using a thunk
// (rather than a precomputed array of React elements) lets each render
// receive the current key from React for the children, which keeps
// `react-native-svg` from logging "missing key" warnings while still letting
// us share a single source of truth for the geometry.
//
// The d-strings are copied verbatim from icons.jsx. Multi-path entries are
// split into one `<Path>` per source `<path>` element to mirror the original
// DOM exactly.

type IconRenderer = () => ReactNode;

const ICONS = {
  // ---------------- nav / tabs ----------------
  ranking: () => <Path key="0" d="M5 21V9m7 12V4m7 17v-8" />,
  matches: () => (
    <>
      <Rect key="0" x={3} y={5} width={18} height={14} rx={2} />
      <Path key="1" d="M3 12h18M8 5v14" />
    </>
  ),
  bell: () => (
    <>
      <Path key="0" d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <Path key="1" d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  user: () => (
    <>
      <Circle key="0" cx={12} cy={8} r={4} />
      <Path key="1" d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  plus: () => <Path key="0" d="M12 5v14M5 12h14" />,

  // ---------------- arrows / chevrons ----------------
  back: () => <Path key="0" d="M15 5l-7 7 7 7" />,
  chevR: () => <Path key="0" d="M9 5l7 7-7 7" />,
  // chevL mirrors chevR — the design bundle only ships chevR + `back`, but
  // RTL gestures and Banner dismiss buttons need a true left chevron.
  chevL: () => <Path key="0" d="M15 5l-7 7 7 7" />,
  chevD: () => <Path key="0" d="M6 9l6 6 6-6" />,
  chevU: () => <Path key="0" d="M6 15l6-6 6 6" />,
  arrowUp: () => <Path key="0" d="M12 19V5M6 11l6-6 6 6" />,
  arrowDn: () => <Path key="0" d="M12 5v14M6 13l6 6 6-6" />,
  arrowRight: () => <Path key="0" d="M5 12h14M13 6l6 6-6 6" />,
  compass: () => (
    <>
      <Circle key="0" cx={12} cy={12} r={9} />
      <Path key="1" d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  people: () => (
    <>
      <Circle key="0" cx={9} cy={9} r={3.2} />
      <Path key="1" d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <Path key="2" d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19a5.5 5.5 0 0 0-3-4.9" />
    </>
  ),
  home: () => <Path key="0" d="M4 11l8-7 8 7M6 10v9h12v-9" />,

  // ---------------- actions / status ----------------
  check: () => <Path key="0" d="M4 12l5 5L20 6" />,
  checkCircle: () => (
    <>
      <Circle key="0" cx={12} cy={12} r={9} />
      <Path key="1" d="M8 12l3 3 5-6" />
    </>
  ),
  x: () => <Path key="0" d="M6 6l12 12M18 6L6 18" />,
  xCircle: () => (
    <>
      <Circle key="0" cx={12} cy={12} r={9} />
      <Path key="1" d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  filter: () => <Path key="0" d="M3 5h18l-7 8v6l-4 2v-8z" />,
  search: () => (
    <>
      <Circle key="0" cx={11} cy={11} r={7} />
      <Path key="1" d="M21 21l-4-4" />
    </>
  ),
  edit: () => (
    <>
      <Path key="0" d="M4 20h4L19 9l-4-4L4 16z" />
      <Path key="1" d="M14 6l4 4" />
    </>
  ),
  settings: () => (
    <>
      <Circle key="0" cx={12} cy={12} r={3} />
      <Path
        key="1"
        d="M12 2v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4l2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
      />
    </>
  ),
  calendar: () => (
    <>
      <Rect key="0" x={3} y={5} width={18} height={16} rx={2} />
      <Path key="1" d="M3 9h18M8 3v4m8-4v4" />
    </>
  ),
  clock: () => (
    <>
      <Circle key="0" cx={12} cy={12} r={9} />
      <Path key="1" d="M12 7v5l3 2" />
    </>
  ),
  pin: () => (
    <>
      <Path key="0" d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
      <Circle key="1" cx={12} cy={10} r={2.5} />
    </>
  ),

  // ---------------- trophies / levels ----------------
  trophy: () => (
    <>
      <Path key="0" d="M7 4h10v4a5 5 0 0 1-10 0z" />
      <Path
        key="1"
        d="M7 5H4v2a3 3 0 0 0 3 3m10-5h3v2a3 3 0 0 1-3 3M9 18h6m-3-4v4m-3 2h6"
      />
    </>
  ),
  crown: () => <Path key="0" d="M4 8l3.5 3L12 6l4.5 5L20 8l-1.5 10h-13z" />,
  flame: () => (
    <Path
      key="0"
      d="M12 3c2 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.5.5-2.5 1-3 0 2 1 2.5 1.5 2.5C9.5 9 12 7 12 3z"
    />
  ),
  bolt: () => <Path key="0" d="M13 3L5 14h6l-1 7 8-11h-6z" />,
  diamond: () => <Path key="0" d="M12 3l8 8-8 10-8-10z" />,
  shield: () => <Path key="0" d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />,
  star: () => <Path key="0" d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" />,
  medal: () => (
    <>
      <Circle key="0" cx={12} cy={14} r={6} />
      <Path key="1" d="M9 3l3 5 3-5" />
    </>
  ),

  // ---------------- comms / sharing ----------------
  share: () => (
    <>
      <Circle key="0" cx={18} cy={5} r={3} />
      <Circle key="1" cx={6} cy={12} r={3} />
      <Circle key="2" cx={18} cy={19} r={3} />
      <Path key="3" d="M8.5 10.5l7-4m0 11l-7-4" />
    </>
  ),
  ban: () => (
    <>
      <Circle key="0" cx={12} cy={12} r={9} />
      <Path key="1" d="M5.6 5.6l12.8 12.8" />
    </>
  ),
  snow: () => (
    <Path
      key="0"
      d="M12 2v20M4 7l16 10M20 7L4 17M12 6l-3 2 3 2 3-2zM12 18l-3-2 3-2 3 2z"
    />
  ),
  trash: () => <Path key="0" d="M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13" />,
  bellOff: () => (
    <>
      <Path
        key="0"
        d="M8.5 5.5A6 6 0 0 1 18 9c0 5 2 6 2 6h-8M3 3l18 18M5.5 9c0 5-1.5 6-1.5 6h6"
      />
      <Path key="1" d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  camera: () => (
    <>
      <Rect key="0" x={3} y={7} width={18} height={13} rx={2} />
      <Circle key="1" cx={12} cy={13.5} r={3.5} />
      <Path key="2" d="M8 7l1.5-3h5L16 7" />
    </>
  ),
  phone: () => (
    <Path
      key="0"
      d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"
    />
  ),
  mail: () => (
    <>
      <Rect key="0" x={3} y={5} width={18} height={14} rx={2} />
      <Path key="1" d="M3 7l9 6 9-6" />
    </>
  ),
  link: () => (
    <Path
      key="0"
      d="M9 15l6-6M10 6l1-1a4 4 0 0 1 6 6l-1 1m-4 6l-1 1a4 4 0 0 1-6-6l1-1"
    />
  ),
  swap: () => <Path key="0" d="M7 4l-3 3 3 3M4 7h12m1 10l3-3-3-3m3 3H8" />,
  handshake: () => (
    <Path
      key="0"
      d="M3 12l4-4 4 3 2-2 4 3 4-4M3 12l3 3a2 2 0 0 0 3 0m6-1l2 2a2 2 0 0 0 3 0l1-1"
    />
  ),
  grid: () => (
    <>
      <Rect key="0" x={3} y={3} width={7} height={7} rx={1.5} />
      <Rect key="1" x={14} y={3} width={7} height={7} rx={1.5} />
      <Rect key="2" x={3} y={14} width={7} height={7} rx={1.5} />
      <Rect key="3" x={14} y={14} width={7} height={7} rx={1.5} />
    </>
  ),
  sun: () => (
    <>
      <Circle key="0" cx={12} cy={12} r={4} />
      <Path
        key="1"
        d="M12 2v2m0 16v2M4 12H2m20 0h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"
      />
    </>
  ),
  moon: () => <Path key="0" d="M20 14a8 8 0 1 1-9-11 6 6 0 0 0 9 11z" />,
  info: () => (
    <>
      <Circle key="0" cx={12} cy={12} r={9} />
      <Path key="1" d="M12 11v5m0-8.5v.5" />
    </>
  ),
  warn: () => (
    <>
      <Path key="0" d="M12 3l9 16H3z" />
      <Path key="1" d="M12 10v4m0 3v.5" />
    </>
  ),
  flag: () => <Path key="0" d="M5 21V4m0 0h12l-2 4 2 4H5" />,
  list: () => (
    <Path key="0" d="M8 6h12M8 12h12M8 18h12M4 6v.01M4 12v.01M4 18v.01" />
  ),
  refresh: () => (
    <Path
      key="0"
      d="M4 12a8 8 0 0 1 14-5l2 2m0-4v4h-4M20 12a8 8 0 0 1-14 5l-2-2m0 4v-4h4"
    />
  ),
  wifiOff: () => (
    <>
      <Path
        key="0"
        d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4-2.5m6 0a10 10 0 0 1 4 2.5M2 8.8a15 15 0 0 1 6-3.2m8 0a15 15 0 0 1 6 3.2"
      />
      <Path key="1" d="M12 20h.01" />
    </>
  ),
  download: () => <Path key="0" d="M12 4v11m-4-4l4 4 4-4M5 20h14" />,
  megaphone: () => (
    <>
      <Path key="0" d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1z" />
      <Path key="1" d="M18 9a4 4 0 0 1 0 6" />
    </>
  ),
  dots: () => (
    <>
      <Circle key="0" cx={5} cy={12} r={1.6} />
      <Circle key="1" cx={12} cy={12} r={1.6} />
      <Circle key="2" cx={19} cy={12} r={1.6} />
    </>
  ),
  lock: () => (
    <>
      <Rect key="0" x={5} y={11} width={14} height={9} rx={2} />
      <Path key="1" d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  eye: () => (
    <>
      <Path key="0" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <Circle key="1" cx={12} cy={12} r={3} />
    </>
  ),
  eyeOff: () => (
    <Path
      key="0"
      d="M3 3l18 18M10.5 6.3A9 9 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.6M6 7.5A17 17 0 0 0 2 12s4 7 10 7a9 9 0 0 0 3.5-.7"
    />
  ),
  spark: () => (
    <Path
      key="0"
      d="M12 3v6m0 6v6m9-9h-6M9 12H3m13.5-4.5L14 10m-4 4l-2.5 2.5m9 0L14 14m-4-4L7.5 7.5"
    />
  ),
} as const satisfies Record<string, IconRenderer>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  /** Pixel size (icon is rendered square). Default 24. */
  size?: number;
  /** Stroke color. Defaults to ink (`colors.text`). */
  color?: string;
  /** Stroke width. Default 2. */
  stroke?: number;
  /**
   * Fill color. Defaults to `'none'` (outlined). Pass a color to render the
   * icon as a filled glyph — useful for `star`, `crown`, `flame` tone variants.
   */
  fill?: string;
  style?: StyleProp<ViewStyle>;
}

export function Icon({
  name,
  size = 24,
  color = colors.text,
  stroke = 2,
  fill = 'none',
  style,
}: IconProps) {
  const render = ICONS[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {render()}
    </Svg>
  );
}
