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

interface TabSlotBase {
  /** Expo Router screen name. Must match the file inside `app/(tabs)/`. */
  name: string;
  /** Turkish accessibility label announced by VoiceOver/TalkBack. */
  label: string;
}

/** Central action button — visually dominant, never persists as active. */
export interface TabSlotCenter extends TabSlotBase {
  isCenter: true;
}

/** A normal slot always has a glyph — no `?? fallback` needed, no silent
 *  misconfiguration possible. */
export interface TabSlotNormal extends TabSlotBase {
  isCenter?: false;
  icon: IconName;
}

export type TabSlotConfig = TabSlotCenter | TabSlotNormal;

export const TAB_SLOTS: TabSlotConfig[] = [
  { name: 'index', icon: 'home', label: 'Anasayfa' },
  { name: 'matches', icon: 'calendar', label: 'Maçlar' }, // upcoming/planned matches
  { name: 'new-match', isCenter: true, label: 'Yeni maç' }, // "+" slot → BallMark
  { name: 'leaderboard', icon: 'ranking', label: 'Sıralama' },
  { name: 'profile', icon: 'user', label: 'Profil' },
];
