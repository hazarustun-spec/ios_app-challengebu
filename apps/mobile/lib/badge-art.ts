// Boğaziçi Tennis Challenger — Achievement Badge Library (vector).
//
// Ported verbatim from the Claude Design project (`app/badge-lib.js`): 35
// cohesive flat-vector badges as pure SVG strings (no deps), so the same source
// renders at any size via react-native-svg's <SvgXml>. Family: round medallion
// base (category-colored), thick ink outlines, single central glyph, premium
// tiers get a beaded/starburst ring.
//
// `badgeSvg(artKey, size)` returns the SVG markup for a design key. The DB seeds
// badges under different codes, so `SEED_TO_ART` maps `badges.code` → art key.

/* eslint-disable @typescript-eslint/no-use-before-define */

const INK = '#161618';
const W = '#FFFFFF';
const LIME = '#8FD43B';
const BLUE = '#2270BC';
const GOLD = '#F5B924';
const PINK = '#F73FBE';
const SILVER = '#C9CDD2';
const BRONZE = '#C68A4E';
const NUMF = "'Space Grotesk', ui-sans-serif, system-ui, sans-serif";

// ---- geometry helpers -------------------------------------------------
function num(t: string, c: string, y?: number, fs?: number): string {
  if (!fs) fs = t.length >= 3 ? 30 : t.length === 2 ? 41 : 47;
  return (
    '<text x="50" y="' +
    (y || 51) +
    '" text-anchor="middle" dominant-baseline="central" ' +
    'font-family="' +
    NUMF +
    '" font-weight="700" font-size="' +
    fs +
    '" letter-spacing="-1" stroke="none" fill="' +
    c +
    '">' +
    t +
    '</text>'
  );
}
function starPts(cx: number, cy: number, o: number, i: number, n: number, rot?: number): string {
  const p: string[] = [];
  for (let k = 0; k < n * 2; k++) {
    const r = k % 2 ? i : o;
    const a = (rot || 0) + (k * Math.PI) / n;
    p.push((cx + r * Math.sin(a)).toFixed(1) + ',' + (cy - r * Math.cos(a)).toFixed(1));
  }
  return p.join(' ');
}
function star(cx: number, cy: number, o: number, i: number, fill: string, stroke: string, sw?: number): string {
  return (
    '<polygon points="' +
    starPts(cx, cy, o, i, 5, 0) +
    '" fill="' +
    fill +
    '" stroke="' +
    stroke +
    '" stroke-width="' +
    (sw || 4) +
    '" stroke-linejoin="round"/>'
  );
}
function beads(cx: number, cy: number, R: number, n: number, fill?: string): string {
  let s = '';
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 2 * Math.PI;
    s +=
      '<circle cx="' +
      (cx + R * Math.cos(a)).toFixed(1) +
      '" cy="' +
      (cy + R * Math.sin(a)).toFixed(1) +
      '" r="2.3" fill="' +
      (fill || INK) +
      '"/>';
  }
  return s;
}
function burst(cx: number, cy: number, o: number, i: number, n: number, fill: string, stroke: string): string {
  return (
    '<polygon points="' +
    starPts(cx, cy, o, i, n, Math.PI / n) +
    '" fill="' +
    fill +
    '" stroke="' +
    stroke +
    '" stroke-width="3" stroke-linejoin="round"/>'
  );
}
function gloss(r: number): string {
  return (
    '<ellipse cx="39" cy="33" rx="' +
    r * 0.38 +
    '" ry="' +
    r * 0.22 +
    '" fill="#FFFFFF" opacity="0.30" transform="rotate(-34 39 33)"/>' +
    '<circle cx="62" cy="30" r="' +
    r * 0.07 +
    '" fill="#FFFFFF" opacity="0.55"/>'
  );
}
function sparkle(x: number, y: number, r: number, fill: string): string {
  const k = r * 0.26;
  return (
    '<path d="M' +
    x +
    ' ' +
    (y - r) +
    'C' +
    x +
    ' ' +
    (y - k) +
    ' ' +
    (x + k) +
    ' ' +
    y +
    ' ' +
    (x + r) +
    ' ' +
    y +
    'C' +
    (x + k) +
    ' ' +
    y +
    ' ' +
    x +
    ' ' +
    (y + k) +
    ' ' +
    x +
    ' ' +
    (y + r) +
    'C' +
    x +
    ' ' +
    (y + k) +
    ' ' +
    (x - k) +
    ' ' +
    y +
    ' ' +
    (x - r) +
    ' ' +
    y +
    'C' +
    (x - k) +
    ' ' +
    y +
    ' ' +
    x +
    ' ' +
    (y - k) +
    ' ' +
    x +
    ' ' +
    (y - r) +
    'Z" ' +
    'fill="' +
    fill +
    '" stroke="#161618" stroke-width="1.4" stroke-linejoin="round"/>'
  );
}
function twinkle(x: number, y: number, r: number, fill: string): string {
  return (
    '<path d="M' +
    x +
    ' ' +
    (y - r * 1.95) +
    ' L' +
    x +
    ' ' +
    (y + r * 1.95) +
    ' M' +
    (x - r * 1.95) +
    ' ' +
    y +
    ' L' +
    (x + r * 1.95) +
    ' ' +
    y +
    '" stroke="' +
    fill +
    '" stroke-width="1.1" stroke-linecap="round" opacity="0.5"/>' +
    sparkle(x, y, r, fill)
  );
}
function stardust(): string {
  return (
    '<circle cx="67" cy="19" r="1.7" fill="#FFFFFF"/><circle cx="21" cy="41" r="1.5" fill="#FFFFFF"/>' +
    '<circle cx="80" cy="58" r="1.6" fill="#FFFFFF"/><circle cx="41" cy="81" r="1.4" fill="#FFFFFF"/>'
  );
}
function sparkles(tier: number): string {
  let s = twinkle(75, 31, 5.8, '#FFFFFF') + sparkle(26, 70, 3.9, '#FFFFFF') + stardust();
  if (tier >= 1)
    s +=
      twinkle(73, 71, 3.8, GOLD) +
      sparkle(28, 28, 3.2, '#FFFFFF') +
      '<circle cx="58" cy="77" r="1.6" fill="' + GOLD + '"/>';
  if (tier >= 2) s += twinkle(50, 88, 4.4, GOLD) + sparkle(13, 50, 3.2, '#FFFFFF') + sparkle(87, 45, 3, GOLD);
  return s;
}

// ---- medallion base ---------------------------------------------------
function medallion(base: string, tier: number): string {
  let s = '';
  let r = 46;
  if (tier === 2) {
    s += burst(50, 50, 50, 39, 16, GOLD, INK);
    s += burst(50, 50, 46, 40, 16, '#FFD964', INK);
    s += beads(50, 50, 44, 28, INK);
    r = 40;
  } else if (tier === 1) {
    s += beads(50, 50, 46, 26, INK);
    r = 42;
  }
  s += '<circle cx="50" cy="50" r="' + r + '" fill="' + base + '" stroke="' + INK + '" stroke-width="4"/>';
  s += '<circle cx="50" cy="50" r="' + (r - 3) + '" fill="none" stroke="#FFFFFF" stroke-width="1.8" opacity="0.22"/>';
  s += '<circle cx="50" cy="50" r="' + (r - 6) + '" fill="none" stroke="' + INK + '" stroke-width="1.6" opacity="0.16"/>';
  if (tier >= 1)
    s += '<circle cx="50" cy="50" r="' + (r - 1.5) + '" fill="none" stroke="' + GOLD + '" stroke-width="1.3" opacity="0.6"/>';
  s += gloss(r);
  if (tier >= 1) s += star(50, 50 - r, 5.4, 2.3, GOLD, INK, 2);
  return s;
}

// ---- shared glyph builders -------------------------------------------
function laurel(): string {
  return (
    '<path d="M31 71 C19 62 19 45 30 35" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M69 71 C81 62 81 45 70 35" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M27 64l-4-2M26 55l-4-2M30 47l-4-3" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M73 64l4-2M74 55l4-2M70 47l4-3" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>'
  );
}
interface MedalOpts {
  disc?: string;
  laurel?: number;
  star?: number;
}
function medal(t: string, opts?: MedalOpts): string {
  opts = opts || {};
  const disc = opts.disc || W;
  let s = '';
  if (opts.laurel) s += laurel();
  s += '<circle cx="50" cy="50" r="20" fill="' + disc + '" stroke="' + INK + '" stroke-width="4"/>';
  s += '<circle cx="50" cy="50" r="15" fill="none" stroke="' + INK + '" stroke-width="1.4" opacity="0.3"/>';
  if (opts.star) s += star(50, 24, 5.4, 2.3, GOLD, INK, 2);
  s += num(t, INK, 51, t.length >= 3 ? 16 : t.length === 2 ? 22 : 26);
  return s;
}

// ---- 35 glyphs (key → fn(ink)) ---------------------------------------
const GLYPH: Record<string, (c: string) => string> = {
  first_step: () =>
    '<path d="M50 75 V46"/>' +
    '<path d="M50 61 C36 61 30 51 30 41 C44 41 50 51 50 61 Z" fill="' + INK + '" stroke="' + INK + '"/>' +
    '<path d="M50 53 C64 53 70 43 70 33 C56 33 50 43 50 53 Z" fill="' + INK + '" stroke="' + INK + '"/>' +
    '<path d="M40 76 H60"/>',
  trio: () =>
    '<circle cx="50" cy="37" r="11"/><path d="M43 29 C49 33 49 41 43 45"/>' +
    '<circle cx="37" cy="60" r="11"/><path d="M30 52 C36 56 36 64 30 68"/>' +
    '<circle cx="63" cy="60" r="11"/><path d="M56 52 C62 56 62 64 56 68"/>',
  high_five: () => {
    const f = INK;
    return (
      '<rect x="37" y="52" width="27" height="20" rx="8" fill="' + f + '" stroke="none"/>' +
      '<rect x="39" y="40" width="5.4" height="16" rx="2.7" fill="' + f + '" stroke="none"/>' +
      '<rect x="46" y="35" width="5.4" height="21" rx="2.7" fill="' + f + '" stroke="none"/>' +
      '<rect x="53" y="37" width="5.4" height="19" rx="2.7" fill="' + f + '" stroke="none"/>' +
      '<rect x="60" y="41" width="5.4" height="15" rx="2.7" fill="' + f + '" stroke="none"/>' +
      '<path d="M37 58 C30 55 27 62 33 66 Z" fill="' + f + '" stroke="none"/>'
    );
  },
  ten: (c) => num('10', c),
  quarter_century: (c) => num('25', c),
  half_century: (c) => num('50', c),
  century: (c) => num('100', c),
  quarter_k: (c) => num('250', c),
  half_k: (c) => num('500', c),

  win1: (c) =>
    '<circle cx="50" cy="50" r="21"/><circle cx="50" cy="50" r="13"/>' +
    '<circle cx="50" cy="50" r="4.5" fill="' + c + '" stroke="none"/>',
  win3: () => medal('3'),
  win5: () => medal('5', { laurel: 1 }),
  win10: () => medal('10', { laurel: 1 }),
  win25: () => medal('25', { laurel: 1, star: 1 }),
  win50: () => medal('50', { laurel: 1, star: 1 }),
  win100: () =>
    laurel() +
    '<circle cx="50" cy="50" r="21" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="50" cy="50" r="16" fill="none" stroke="' + INK + '" stroke-width="1.4" opacity="0.35"/>' +
    star(50, 24, 5.6, 2.4, GOLD, INK, 2) +
    num('100', INK, 51, 16),
  bagel: () =>
    '<circle cx="50" cy="50" r="21" fill="' + W + '" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="50" cy="50" r="8" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="42" cy="41" r="1.7" fill="' + INK + '"/><circle cx="59" cy="43" r="1.7" fill="' + INK + '"/>' +
    '<circle cx="57" cy="59" r="1.7" fill="' + INK + '"/><circle cx="41" cy="58" r="1.7" fill="' + INK + '"/>',
  comeback: () =>
    '<polyline points="27,61 42,68 56,53 69,37" fill="none" stroke="' + LIME + '" stroke-width="5.5"/>' +
    '<path d="M60 37 H70 V47" fill="none" stroke="' + LIME + '" stroke-width="5.5"/>' +
    '<path d="M40 30 c3 4 5 5 5 9 a4.5 4.5 0 0 1 -9 0 c0 -3 1.5 -4 2 -5 0 2.5 2 2.5 2 -4 z" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="2"/>',

  first_double: (c) =>
    '<path d="M18 45 L34 45 L46 54" stroke="' + c + '" stroke-width="5" fill="none"/>' +
    '<path d="M82 45 L66 45 L54 54" stroke="' + c + '" stroke-width="5" fill="none"/>' +
    '<rect x="43" y="48" width="14" height="14" rx="3.5" fill="' + c + '" stroke="none"/>' +
    '<rect x="13" y="41" width="8" height="9" rx="2" fill="' + c + '" stroke="none"/>' +
    '<rect x="79" y="41" width="8" height="9" rx="2" fill="' + c + '" stroke="none"/>',
  partners5: () =>
    '<circle cx="50" cy="39" r="9"/><path d="M34 67 a16 16 0 0 1 32 0" fill="none"/>' +
    '<circle cx="29" cy="46" r="6.6"/><path d="M17 66 a12 12 0 0 1 13 -8" fill="none"/>' +
    '<circle cx="71" cy="46" r="6.6"/><path d="M83 66 a12 12 0 0 0 -13 -8" fill="none"/>',
  opponents10: () =>
    '<circle cx="40" cy="47" r="9"/><path d="M27 67 a13 13 0 0 1 26 0" fill="none"/>' +
    '<circle cx="64" cy="51" r="7.6"/><path d="M53 69 a11 11 0 0 1 22 0" fill="none"/>' +
    '<path d="M48 23 v11 M42.5 28.5 h11" stroke="' + LIME + '" stroke-width="5"/>',

  top10: () =>
    '<path d="M30 73 C18 64 18 46 27 36" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M70 73 C82 64 82 46 73 36" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    star(50, 24, 6, 2.5, GOLD, INK, 2) +
    num('10', INK, 54),
  top3: () =>
    '<rect x="32" y="56" width="13" height="15" fill="' + W + '" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<rect x="43.5" y="43" width="13" height="28" fill="' + W + '" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<rect x="55" y="62" width="13" height="9" fill="' + W + '" stroke="' + INK + '" stroke-width="3.4"/>' +
    star(50, 36, 6.5, 2.7, GOLD, INK, 2.4),
  champion: () =>
    '<path d="M25 60 L31 33 L42 48 L50 29 L58 48 L69 33 L75 60 Z" fill="' + W + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M25 64 H75" stroke="' + INK + '" stroke-width="4.5" stroke-linecap="round"/>' +
    '<circle cx="31" cy="33" r="3" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="50" cy="29" r="3.6" fill="' + PINK + '" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="69" cy="33" r="3" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="50" cy="55" r="3" fill="' + PINK + '" stroke="' + INK + '" stroke-width="2"/>',
  finalist: () => medal('2', { disc: SILVER, laurel: 1 }),
  semifinalist: () => medal('4', { disc: BRONZE, laurel: 1 }),

  yearly_champ: () =>
    '<path d="M35 29 H65 V40 C65 53 58 59 50 59 C42 59 35 53 35 40 Z" fill="' + W + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M35 32 C27 32 26 45 37 47" fill="none" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M65 32 C73 32 74 45 63 47" fill="none" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<rect x="46" y="59" width="8" height="9" fill="' + W + '" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<rect x="35" y="68" width="30" height="7" rx="2" fill="' + W + '" stroke="' + INK + '" stroke-width="3.4"/>' +
    star(50, 42, 7, 3, GOLD, INK, 2.2),

  night_owl: () =>
    '<path d="M34 30 L41 41 M66 30 L59 41" stroke="' + W + '" stroke-width="5" stroke-linecap="round"/>' +
    '<circle cx="50" cy="52" r="22" fill="none" stroke="' + W + '" stroke-width="5"/>' +
    '<circle cx="42" cy="48" r="8" fill="' + W + '" stroke="none"/><circle cx="42" cy="48" r="3.2" fill="' + BLUE + '"/>' +
    '<circle cx="58" cy="48" r="8" fill="' + W + '" stroke="none"/><circle cx="58" cy="48" r="3.2" fill="' + BLUE + '"/>' +
    '<path d="M46 56 L50 63 L54 56 Z" fill="' + GOLD + '" stroke="none"/>' +
    '<path d="M40 71 L46 65 M60 71 L54 65" stroke="' + W + '" stroke-width="4" stroke-linecap="round"/>',
  early_bird: () =>
    '<circle cx="61" cy="38" r="7" fill="' + W + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M61 25 v-5 M61 56 v-3 M48 38 h-5 M74 38 h5 M52 29 l-3 -3 M70 29 l3 -3 M52 47 l-3 3 M70 47 l3 3" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M27 60 Q37 50 45 60 Q53 50 61 60" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M30 71 Q50 65 70 71" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>',
  court_lover: () =>
    '<path d="M50 16 c-3 -3 -9 -1 -9 4 c0 5 9 10 9 10 c0 0 9 -5 9 -10 c0 -5 -6 -7 -9 -4 z" fill="' + W + '" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="30" y="35" width="40" height="37" rx="4" fill="none" stroke="' + W + '" stroke-width="4.5"/>' +
    '<path d="M30 53.5 H70" stroke="' + W + '" stroke-width="3.4"/>' +
    '<path d="M50 35 V72" stroke="' + W + '" stroke-width="2.4" opacity="0.7"/>' +
    '<path d="M41 44 H59 M41 63 H59" stroke="' + W + '" stroke-width="2.4" opacity="0.7"/>',
  globetrotter: () =>
    '<path d="M50 30 C40 30 33 38 33 48 C33 60 50 75 50 75 C50 75 67 60 67 48 C67 38 60 30 50 30 Z" fill="' + W + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="47" r="7" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="26" cy="71" r="2.4" fill="' + W + '"/><circle cx="33" cy="74" r="2.4" fill="' + W + '"/><circle cx="41" cy="75" r="2.4" fill="' + W + '"/>',
  marathon: () =>
    '<circle cx="59" cy="29" r="6" fill="' + INK + '" stroke="none"/>' +
    '<path d="M59 36 L49 50 L40 59 M49 50 L61 55 L64 67" fill="none" stroke="' + INK + '" stroke-width="5"/>' +
    '<path d="M58 41 L67 38 M58 41 L47 45" stroke="' + INK + '" stroke-width="5"/>' +
    '<path d="M21 38 H32 M19 48 H33 M23 58 H30" stroke="' + INK + '" stroke-width="4" stroke-linecap="round" opacity="0.85"/>',

  season1: () => star(50, 51, 24, 10.5, LIME, INK, 4),
  year1: () => star(45, 53, 19, 8.5, LIME, INK, 4) + star(67, 35, 11, 4.8, GOLD, INK, 3),
  founder: () =>
    '<path d="M32 36 L50 23 L68 36 Z" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="33" y="38" width="34" height="6" rx="1.5" fill="' + W + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="40" y="44" width="20" height="22" fill="' + W + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M46 44 V66 M50 44 V66 M54 44 V66" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="33" y="66" width="34" height="6" rx="1.5" fill="' + W + '" stroke="' + INK + '" stroke-width="3"/>',
};

interface BadgeDef {
  key: string;
  base: string;
  tier: number;
}
const DEFS: BadgeDef[] = [
  { key: 'first_step', base: LIME, tier: 0 },
  { key: 'trio', base: LIME, tier: 0 },
  { key: 'high_five', base: LIME, tier: 0 },
  { key: 'ten', base: LIME, tier: 0 },
  { key: 'quarter_century', base: LIME, tier: 0 },
  { key: 'half_century', base: LIME, tier: 0 },
  { key: 'century', base: LIME, tier: 1 },
  { key: 'quarter_k', base: LIME, tier: 1 },
  { key: 'half_k', base: LIME, tier: 2 },
  { key: 'win1', base: BLUE, tier: 0 },
  { key: 'win3', base: BLUE, tier: 0 },
  { key: 'win5', base: BLUE, tier: 0 },
  { key: 'win10', base: BLUE, tier: 0 },
  { key: 'win25', base: BLUE, tier: 0 },
  { key: 'win50', base: BLUE, tier: 0 },
  { key: 'win100', base: BLUE, tier: 1 },
  { key: 'bagel', base: BLUE, tier: 0 },
  { key: 'comeback', base: BLUE, tier: 0 },
  { key: 'first_double', base: PINK, tier: 0 },
  { key: 'partners5', base: PINK, tier: 0 },
  { key: 'opponents10', base: PINK, tier: 0 },
  { key: 'top10', base: GOLD, tier: 1 },
  { key: 'top3', base: GOLD, tier: 1 },
  { key: 'champion', base: GOLD, tier: 1 },
  { key: 'finalist', base: GOLD, tier: 1 },
  { key: 'semifinalist', base: GOLD, tier: 1 },
  { key: 'yearly_champ', base: GOLD, tier: 2 },
  { key: 'night_owl', base: BLUE, tier: 0 },
  { key: 'early_bird', base: GOLD, tier: 0 },
  { key: 'court_lover', base: PINK, tier: 0 },
  { key: 'globetrotter', base: BLUE, tier: 0 },
  { key: 'marathon', base: LIME, tier: 0 },
  { key: 'season1', base: INK, tier: 0 },
  { key: 'year1', base: INK, tier: 1 },
  { key: 'founder', base: INK, tier: 1 },
];

const BY_KEY: Record<string, BadgeDef> = {};
DEFS.forEach((d) => {
  BY_KEY[d.key] = d;
});
const LIGHT: Record<string, number> = {};
LIGHT[LIME] = 1;
LIGHT[GOLD] = 1;

/** Full SVG markup for a design key (e.g. `first_step`), sized to `size` px. */
export function badgeSvg(key: string, size = 100): string {
  const d = BY_KEY[key];
  if (!d) return '';
  const ink = LIGHT[d.base] ? INK : W;
  const inner =
    '<g fill="none" stroke="' + ink + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">' +
    GLYPH[d.key](ink) +
    '</g>';
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="' +
    size +
    '" height="' +
    size +
    '">' +
    medallion(d.base, d.tier) +
    inner +
    sparkles(d.tier) +
    '</svg>'
  );
}

/** `badges.code` (DB seed) → design art key. */
export const SEED_TO_ART: Record<string, string> = {
  milestone_1_match: 'first_step',
  milestone_3_matches: 'trio',
  milestone_5_matches: 'high_five',
  milestone_10_matches: 'ten',
  milestone_25_matches: 'quarter_century',
  milestone_50_matches: 'half_century',
  milestone_100_matches: 'century',
  milestone_250_matches: 'quarter_k',
  milestone_500_matches: 'half_k',
  wins_1: 'win1',
  wins_3: 'win3',
  wins_5: 'win5',
  wins_10: 'win10',
  wins_25: 'win25',
  wins_50: 'win50',
  wins_100: 'win100',
  bagel: 'bagel',
  comeback: 'comeback',
  social_first_doubles: 'first_double',
  social_5_diff_partners: 'partners5',
  social_10_diff_opponents: 'opponents10',
  season_ladder_top10: 'top10',
  season_ladder_top3: 'top3',
  season_champion: 'champion',
  season_finalist: 'finalist',
  season_semifinalist: 'semifinalist',
  yearly_champion: 'yearly_champ',
  fun_night_owl: 'night_owl',
  fun_early_bird: 'early_bird',
  fun_bebek_lover: 'court_lover',
  fun_court_explorer: 'globetrotter',
  fun_marathon: 'marathon',
  loyalty_first_season: 'season1',
  loyalty_one_year: 'year1',
  loyalty_founder: 'founder',
};

/** Resolve a DB badge code to its SVG (empty string if unmapped). */
export function badgeSvgForCode(code: string, size = 100): string {
  const art = SEED_TO_ART[code];
  return art ? badgeSvg(art, size) : '';
}
