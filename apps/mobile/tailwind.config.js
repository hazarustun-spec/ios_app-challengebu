/** @type {import('tailwindcss').Config} */

// NOTE: Source of truth for these color tokens is `apps/mobile/theme/colors.ts`.
// Tailwind config is loaded by Node at build time and cannot require a `.ts`
// file directly, so the palette is duplicated here (Option A). If you change
// a token, update BOTH files in lockstep.
const colors = {
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

  // Lime
  lime: '#8FD43B',
  limeBright: '#9BE048',
  limeDeep: '#5C8C1E',
  limeSoft: '#EAF6D6',
  onLime: '#161618',

  // Court mavi
  court: '#2270BC',
  court2: '#1A5694',
  blueSoft: '#DCE9F4',

  // Pink
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
  info: '#2270BC',
};

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Surfaces
        bg: colors.bg,
        surface: colors.surface,
        'surface-2': colors.surface2,
        'surface-3': colors.surface3,

        // Borders
        'border-strong': colors.borderStrong,

        // Text
        text: colors.text,
        'text-2': colors.text2,
        'text-3': colors.text3,

        // Primary action
        clay: colors.clay,
        'clay-press': colors.clayPress,
        'clay-soft': colors.claySoft,
        'clay-softer': colors.claySofter,
        'clay-text': colors.clayText,

        // Lime
        lime: colors.lime,
        'lime-bright': colors.limeBright,
        'lime-deep': colors.limeDeep,
        'lime-soft': colors.limeSoft,
        'on-lime': colors.onLime,

        // Court mavi
        court: colors.court,
        'court-2': colors.court2,
        'blue-soft': colors.blueSoft,

        // Pink
        pink: colors.pink,
        'pink-deep': colors.pinkDeep,
        'pink-soft': colors.pinkSoft,

        // Misc
        star: colors.star,
        frozen: colors.frozen,
        'frozen-soft': colors.frozenSoft,

        // Semantik
        win: colors.win,
        loss: colors.loss,
        warn: colors.warn,
        'warn-soft': colors.warnSoft,
        info: colors.info,
      },
      spacing: {
        // Half-step augmentations on top of Tailwind's default 0/0.5/1/...
        '0.5': 2,
        '1.5': 6,
        '4.5': 18,
        '5.5': 22,
      },
      borderRadius: {
        xs: '10px',
        sm: '14px',
        md: '18px',
        lg: '26px',
        xl: '34px',
        pill: '9999px',
      },
      borderWidth: {
        base: '1.5px',
        emphasis: '5px',
        'emphasis-max': '10px',
      },
      fontFamily: {
        display: ['BricolageGrotesque-ExtraBold'],
        sans: ['PlusJakartaSans'],
        num: ['SpaceGrotesk-ExtraBold'],
      },
      fontSize: {
        // Plan 8 type scale
        display: ['46px', { lineHeight: '44px', letterSpacing: '-1.38px' }],
        h1: ['27px', { lineHeight: '28px', letterSpacing: '-0.54px' }],
        h2: ['21px', { lineHeight: '23px', letterSpacing: '-0.42px' }],
        h3: ['18px', { lineHeight: '22px', letterSpacing: '-0.18px' }],
        'body-lg': ['15.5px', { lineHeight: '22px' }],
        body: ['14px', { lineHeight: '21px' }],
        caption: ['12.5px', { lineHeight: '18px' }],
        label: ['11px', { letterSpacing: '1.1px' }],
      },
      // Sıfır gölge — derinlik 1.5px ink hat + renk kontrastıyla kurulur
      boxShadow: { none: 'none' },
    },
  },
  plugins: [],
};
