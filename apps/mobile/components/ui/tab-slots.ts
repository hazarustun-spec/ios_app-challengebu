// Tab bar slot configuration.
//
// Extracted from TabBar.tsx so the slot order + glyph choices are assertable
// in `bun test` — TabBar itself uses hooks and cannot be invoked directly
// under the repo's renderer-free test pattern.
//
// IMPORTANT: this module must stay free of runtime react-native / expo
// imports. `IconName` is a type-only import and is erased at compile time,
// which is what keeps this file loadable under bun:test.

import type { IconName } from './Icon';

export interface TabSlotConfig {
  /** Expo Router screen name. Must match the file inside `app/(tabs)/`. */
  name: string;
  /**
   * Glyph for a normal slot. Omitted for the center slot, which renders the
   * BallMark doodle instead of an Icon glyph.
   */
  icon?: IconName;
  /** Central action button — visually dominant, never persists as active. */
  isCenter?: boolean;
}

export const TAB_SLOTS: TabSlotConfig[] = [
  { name: 'index', icon: 'home' }, // Anasayfa (landing)
  { name: 'matches', icon: 'calendar' }, // Maçlar — upcoming/planned matches
  { name: 'new-match', isCenter: true }, // "+" slot → BallMark
  { name: 'leaderboard', icon: 'ranking' }, // Sıralama
  { name: 'profile', icon: 'user' },
];
