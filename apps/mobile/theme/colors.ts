// apps/mobile/theme/colors.ts
// Source: docs/superpowers/specs/plan-8-design-bundle/project/styles/tokens.css

export const colors = {
  // Surfaces
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#F3F3F1',
  surface3: '#E8E8E4',

  // Borders
  borderStrong: '#1A1A1A',

  // Text
  text: '#161618',
  text2: '#65656E',
  text3: '#A2A2AA',

  // Primary action (ink CTA)
  clay: '#161618',
  clayPress: '#000000',
  claySoft: '#EAF6D6',
  claySofter: '#F3FAE7',
  clayText: '#5C8C1E',

  // Lime — marka dolgusu
  lime: '#8FD43B',
  limeBright: '#9BE048',
  limeDeep: '#5C8C1E',
  limeSoft: '#EAF6D6',
  onLime: '#161618',

  // Court mavi — rekabet
  court: '#2270BC',
  court2: '#1A5694',
  blueSoft: '#DCE9F4',

  // Pink — seyrek vurgu
  pink: '#F73FBE',
  pinkDeep: '#C81E92',
  pinkSoft: '#FFE3F6',

  // Misc
  star: '#F5B924',
  frozen: '#5E7CB4',
  frozenSoft: '#E6EDF7',

  // Semantik
  win: '#5C8C1E',
  loss: '#E0463C',
  warn: '#E0992B',
  warnSoft: '#FBEFD6',
  info: '#2270BC', // same as court

  // Seviyeler (Çekirge → Şampiyon)
  lvCekirge: '#6F8B47',
  lvCaylak: '#5E8B39',
  lvAmator: '#2E63B8',
  lvRekabet: '#2742A0',
  lvUsta: '#2A3A8E',
  lvElit: '#2B357A',
  lvSampiyon: '#B98A1E',

  // Aksent
  acGold: '#B98A1E',
  acGreen: '#5E8B39',
  acDgreen: '#4C7330',
  acNavy: '#2742A0',
  acBlue: '#2E63B8',
  acPurple: '#7A4FA0',
} as const;

export type ColorToken = keyof typeof colors;
