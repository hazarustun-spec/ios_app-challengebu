export const LEVEL_CODES = [
  'yeni_cekirge',
  'caylak',
  'amator',
  'rekabetci',
  'usta',
  'elit',
  'sampiyon',
] as const;

export type LevelCode = (typeof LEVEL_CODES)[number];

export interface Level {
  code: LevelCode;
  name_tr: string;
  icon: string;
  threshold: number;
}

export const LEVELS: readonly Level[] = [
  { code: 'yeni_cekirge', name_tr: 'Yeni Çekirge', icon: '🌱', threshold: 0 },
  { code: 'caylak',       name_tr: 'Çaylak',       icon: '🎾', threshold: 1000 },
  { code: 'amator',       name_tr: 'Amatör',       icon: '🏃', threshold: 1200 },
  { code: 'rekabetci',    name_tr: 'Rekabetçi',    icon: '⚡', threshold: 1400 },
  { code: 'usta',         name_tr: 'Usta',         icon: '🔥', threshold: 1600 },
  { code: 'elit',         name_tr: 'Elit',         icon: '💎', threshold: 1800 },
  { code: 'sampiyon',     name_tr: 'Şampiyon',     icon: '👑', threshold: 2000 },
];

export function getLevel(elo: number): Level {
  if (!Number.isFinite(elo)) {
    throw new Error(`elo must be a finite number, got ${elo}`);
  }
  let current: Level = LEVELS[0];
  for (const lvl of LEVELS) {
    if (elo >= lvl.threshold) current = lvl;
  }
  return current;
}

export interface LevelChange {
  up: boolean;
  down: boolean;
  before: Level;
  after: Level;
}

export function levelChanged(beforeElo: number, afterElo: number): LevelChange {
  const before = getLevel(beforeElo);
  const after = getLevel(afterElo);
  const beforeIdx = LEVELS.findIndex((l) => l.code === before.code);
  const afterIdx = LEVELS.findIndex((l) => l.code === after.code);
  return {
    up: afterIdx > beforeIdx,
    down: afterIdx < beforeIdx,
    before,
    after,
  };
}
