/* global React, window */
// ============================================================
// Doodles — abstract hand-drawn decorations (no characters)
// squiggle, blob, star, underline, spark, arrow, scribble
// ============================================================

function Squiggle({ w = 60, color = 'var(--pink)', stroke = 3, style }) {
  return (
    <svg width={w} height={w * 0.25} viewBox="0 0 60 15" fill="none" style={style}>
      <path d="M2 8 C8 2, 14 14, 20 8 S32 2, 38 8 S50 14, 58 8" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  );
}

function Blob({ size = 90, color = 'var(--lime)', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={style}>
      <path d="M51 6c16-2 33 7 39 22s2 33-9 45-29 20-44 15S9 70 9 53 14 19 28 11 38 8 51 6z" fill={color} />
    </svg>
  );
}

// outline cloud/blob like the reference scribbles
function Cloud({ w = 120, color = 'var(--text)', stroke = 3.4, fill = 'none', style }) {
  return (
    <svg width={w} height={w * 0.62} viewBox="0 0 120 74" fill={fill} style={style}>
      <path d="M28 64c-13 0-22-9-22-20 0-9 6-16 15-19-1-12 8-21 20-21 9 0 16 5 19 13 3-2 7-3 11-3 11 0 19 8 19 18 9 1 17 7 17 17 0 11-9 18-21 18H28z"
        stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
    </svg>
  );
}

function Star({ size = 26, color = 'var(--pink)', filled = true, stroke = 2.6, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={stroke} strokeLinejoin="round" style={style}>
      <path d="M12 2.5l2.2 6.3 6.8.2-5.4 4.1 2 6.6L12 16l-5.6 3.7 2-6.6-5.4-4.1 6.8-.2z" />
    </svg>
  );
}

// 4-point sparkle
function Sparkle({ size = 22, color = 'var(--pink)', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <path d="M12 1c.6 5.6 4.4 9.4 10 10-5.6.6-9.4 4.4-10 10-.6-5.6-4.4-9.4-10-10C7.6 10.4 11.4 6.6 12 1z" />
    </svg>
  );
}

function Underline({ w = 120, color = 'var(--lime)', stroke = 7, style }) {
  return (
    <svg width={w} height="14" viewBox="0 0 120 14" fill="none" style={style} preserveAspectRatio="none">
      <path d="M3 9c22-5 70-7 114-4" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  );
}

function Arrow({ w = 60, color = 'var(--text)', stroke = 3, style }) {
  return (
    <svg width={w} height={w * 0.5} viewBox="0 0 60 30" fill="none" style={style}>
      <path d="M3 8c14 14 30 16 50 12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <path d="M46 26c4-3 7-5 10-6-3-2-6-5-8-9" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Scribble({ size = 70, color = 'var(--text)', stroke = 3, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 70 70" fill="none" style={style}>
      <path d="M20 14c12-6 26-2 30 8s-4 22-16 22-22-8-18-18 18-14 28-6 10 22-2 28" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  );
}

// small dots burst
function Dots({ size = 40, color = 'var(--pink)', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill={color} style={style}>
      {[[8, 20], [20, 8], [32, 20], [20, 32], [13, 13], [27, 13], [27, 27], [13, 27]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 2 : 2.8} />)}
    </svg>
  );
}

// tennis ball mark — clean, bold outline style
function BallMark({ size = 88, color = 'var(--lime)', stroke = 'var(--text)', sw = 3.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill={color} stroke={stroke} strokeWidth={sw} />
      <path d="M16 18 C40 36, 40 64, 16 82" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <path d="M84 18 C60 36, 60 64, 84 82" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
}

Object.assign(window, { Squiggle, Blob, Cloud, Star, Sparkle, Underline, Arrow, Scribble, Dots, BallMark });
