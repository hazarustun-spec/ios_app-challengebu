/* global React */
// ============================================================
// Icons + Level system + Badges
// Clean stroked line icons (24x24). Level marks = minimalist geometry.
// ============================================================

const ICON_PATHS = {
  // nav / tabs
  ranking:   '<path d="M5 21V9m7 12V4m7 17v-8" />',
  matches:   '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 12h18M8 5v14"/>',
  bell:      '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  user:      '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  plus:      '<path d="M12 5v14M5 12h14"/>',
  // arrows / chevrons
  back:      '<path d="M15 5l-7 7 7 7"/>',
  chevR:     '<path d="M9 5l7 7-7 7"/>',
  chevD:     '<path d="M6 9l6 6 6-6"/>',
  chevU:     '<path d="M6 15l6-6 6 6"/>',
  arrowUp:   '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowDn:   '<path d="M12 5v14M6 13l6 6 6-6"/>',
  arrowRight:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  compass:   '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  people:    '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19a5.5 5.5 0 0 0-3-4.9"/>',
  home:      '<path d="M4 11l8-7 8 7M6 10v9h12v-9"/>',
  // actions
  check:     '<path d="M4 12l5 5L20 6"/>',
  checkCircle:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  x:         '<path d="M6 6l12 12M18 6L6 18"/>',
  xCircle:   '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  filter:    '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  search:    '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  edit:      '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  settings:  '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4l2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  calendar:  '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4m8-4v4"/>',
  clock:     '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin:       '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  trophy:    '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 5H4v2a3 3 0 0 0 3 3m10-5h3v2a3 3 0 0 1-3 3M9 18h6m-3-4v4m-3 2h6"/>',
  crown:     '<path d="M4 8l3.5 3L12 6l4.5 5L20 8l-1.5 10h-13z"/>',
  flame:     '<path d="M12 3c2 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.5.5-2.5 1-3 0 2 1 2.5 1.5 2.5C9.5 9 12 7 12 3z"/>',
  bolt:      '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  diamond:   '<path d="M12 3l8 8-8 10-8-10z"/>',
  shield:    '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>',
  star:      '<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/>',
  medal:     '<circle cx="12" cy="14" r="6"/><path d="M9 3l3 5 3-5"/>',
  share:     '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.5 10.5l7-4m0 11l-7-4"/>',
  ban:       '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  snow:      '<path d="M12 2v20M4 7l16 10M20 7L4 17M12 6l-3 2 3 2 3-2zM12 18l-3-2 3-2 3 2z"/>',
  trash:     '<path d="M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13"/>',
  bellOff:   '<path d="M8.5 5.5A6 6 0 0 1 18 9c0 5 2 6 2 6h-8M3 3l18 18M5.5 9c0 5-1.5 6-1.5 6h6"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  camera:    '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
  phone:     '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail:      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  link:      '<path d="M9 15l6-6M10 6l1-1a4 4 0 0 1 6 6l-1 1m-4 6l-1 1a4 4 0 0 1-6-6l1-1"/>',
  swap:      '<path d="M7 4l-3 3 3 3M4 7h12m1 10l3-3-3-3m3 3H8"/>',
  handshake: '<path d="M3 12l4-4 4 3 2-2 4 3 4-4M3 12l3 3a2 2 0 0 0 3 0m6-1l2 2a2 2 0 0 0 3 0l1-1"/>',
  grid:      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  sun:       '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4 12H2m20 0h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
  moon:      '<path d="M20 14a8 8 0 1 1-9-11 6 6 0 0 0 9 11z"/>',
  info:      '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8.5v.5"/>',
  warn:      '<path d="M12 3l9 16H3z"/><path d="M12 10v4m0 3v.5"/>',
  flag:      '<path d="M5 21V4m0 0h12l-2 4 2 4H5"/>',
  list:      '<path d="M8 6h12M8 12h12M8 18h12M4 6v.01M4 12v.01M4 18v.01"/>',
  refresh:   '<path d="M4 12a8 8 0 0 1 14-5l2 2m0-4v4h-4M20 12a8 8 0 0 1-14 5l-2-2m0 4v-4h4"/>',
  wifiOff:   '<path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4-2.5m6 0a10 10 0 0 1 4 2.5M2 8.8a15 15 0 0 1 6-3.2m8 0a15 15 0 0 1 6 3.2"/><path d="M12 20h.01"/>',
  download:  '<path d="M12 4v11m-4-4l4 4 4-4M5 20h14"/>',
  megaphone: '<path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
  dots:      '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  lock:      '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  eye:       '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:    '<path d="M3 3l18 18M10.5 6.3A9 9 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.6M6 7.5A17 17 0 0 0 2 12s4 7 10 7a9 9 0 0 0 3.5-.7"/>',
  spark:     '<path d="M12 3v6m0 6v6m9-9h-6M9 12H3m13.5-4.5L14 10m-4 4l-2.5 2.5m9 0L14 14m-4-4L7.5 7.5"/>',
};

function Icon({ name, size = 22, color = 'currentColor', stroke = 2, fill = 'none', style }) {
  const d = ICON_PATHS[name] || '';
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill,
    stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round',
    style, dangerouslySetInnerHTML: { __html: d },
  });
}

// ---------------- Level system ----------------
// ELO thresholds (placeholder, soft-reset baseline 1200) — adjustable.
const LEVELS = [
  { key: 'cekirge', name: 'Yeni Çekirge', min: 0,    color: 'var(--lv-cekirge)', mark: 'seed' },
  { key: 'caylak',  name: 'Çaylak',       min: 1100, color: 'var(--lv-caylak)', mark: 'circle' },
  { key: 'amator',  name: 'Amatör',       min: 1250, color: 'var(--lv-amator)', mark: 'triangle' },
  { key: 'rekabet', name: 'Rekabetçi',    min: 1400, color: 'var(--lv-rekabet)', mark: 'bolt' },
  { key: 'usta',    name: 'Usta',         min: 1550, color: 'var(--lv-usta)', mark: 'diamond' },
  { key: 'elit',    name: 'Elit',         min: 1700, color: 'var(--lv-elit)', mark: 'hex' },
  { key: 'sampiyon',name: 'Şampiyon',     min: 1850, color: 'var(--lv-sampiyon)', mark: 'crown' },
];
function levelForElo(elo) {
  let l = LEVELS[0];
  for (const lv of LEVELS) if (elo >= lv.min) l = lv;
  return l;
}
// progress toward the next level (0..1) + cur/next level refs
function levelProgress(elo) {
  const cur = levelForElo(elo);
  const idx = LEVELS.findIndex(l => l.key === cur.key);
  const next = LEVELS[idx + 1] || null;
  if (!next) return { pct: 1, cur, next: null, toNext: 0 };
  return { pct: Math.max(0, Math.min(1, (elo - cur.min) / (next.min - cur.min))), cur, next, toNext: next.min - elo };
}

const LEVEL_MARKS = {
  seed:     '<circle cx="12" cy="14" r="3"/><path d="M12 11c0-3 2-4 4-4 0 3-2 4-4 4z"/>',
  circle:   '<circle cx="12" cy="12" r="6"/>',
  triangle: '<path d="M12 5l7 13H5z"/>',
  bolt:     '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  diamond:  '<path d="M12 3l8 9-8 9-8-9z"/>',
  hex:      '<path d="M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9z"/>',
  crown:    '<path d="M4 8l3.5 3L12 6l4.5 5L20 8l-1.5 9h-13z"/>',
};

function LevelIcon({ level, size = 18, filled = true }) {
  const lv = typeof level === 'string' ? LEVELS.find(l => l.key === level) : level;
  if (!lv) return null;
  const d = LEVEL_MARKS[lv.mark];
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: filled ? lv.color : 'none', stroke: lv.color, strokeWidth: 1.6,
    strokeLinejoin: 'round',
    dangerouslySetInnerHTML: { __html: d },
  });
}

// status icon (frozen ❄️, season champ 👑, annual 🏆)
function StatusMark({ kind, size = 16 }) {
  const map = {
    frozen:  { name: 'snow',   color: 'var(--frozen)' },
    seasonChamp: { name: 'crown', color: '#C9982E' },
    annualChamp: { name: 'trophy', color: '#B98A1E' },
  };
  const m = map[kind];
  if (!m) return null;
  return React.createElement(Icon, { name: m.name, size, color: m.color, stroke: 2.2 });
}

Object.assign(window, { Icon, LEVELS, levelForElo, levelProgress, LevelIcon, StatusMark });
