/* global React, window, Icon, LevelIcon, StatusMark, BADGES, avatarFor, levelForElo */
// ============================================================
// Shared UI components
// ============================================================
const { useState } = React;

function cx(...a) { return a.filter(Boolean).join(' '); }

// ---------- Avatar ----------
const MEDAL_COLORS = { 1: '#C9982E', 2: '#9AA0A6', 3: '#B0743A' };
// one badge system for every avatar — consistent corner, scale, white outline
function AvatarBadge({ size, kind, level }) {
  const d = Math.max(15, Math.round(size * 0.36));      // badge diameter
  const base = { position: 'absolute', right: -2, bottom: -2, width: d, height: d, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--surface)', boxSizing: 'border-box' };
  if (kind === 'frozen') return <div style={{ ...base, background: 'var(--frozen)' }}><Icon name="snow" size={d * 0.62} color="#fff" stroke={2.6} /></div>;
  if (kind === 'level' && level) return <div style={{ ...base, background: level.color }}><Icon name={level.icon || 'medal'} size={d * 0.6} color="#fff" stroke={2.4} /></div>;
  if (typeof kind === 'number' && MEDAL_COLORS[kind]) return <div style={{ ...base, background: MEDAL_COLORS[kind] }}><span className="num" style={{ fontWeight: 800, fontSize: d * 0.56, color: '#fff', lineHeight: 1 }}>{kind}</span></div>;
  return null;
}

// Unified avatar. ring=color (crisp outline ring). badge: 'frozen' | 'level'(+level) | 1|2|3 (medal).
// status='frozen' kept for back-compat. slot=id → user-fillable real photo.
function Avatar({ name, size = 44, src, ring, status, badge, level, slot, round, noBorder }) {
  const a = avatarFor(name || '?');
  const radius = round ? '50%' : 'var(--r-md)';
  const square = !round;
  const b = badge != null ? badge : (status === 'frozen' ? 'frozen' : null);
  const frozen = b === 'frozen';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: radius, overflow: 'hidden',
        background: src ? `center/cover url(${src})` : a.bg,
        color: a.fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: size * 0.38, fontFamily: 'var(--font-sans)',
        filter: frozen ? 'grayscale(.85)' : 'none',
        border: ring ? `2px solid ${ring}` : (noBorder ? 'none' : '1.5px solid var(--border-strong)'),
        boxSizing: 'border-box',
      }}>
        {slot
          ? <image-slot id={slot} shape={square ? 'rounded' : 'circle'} radius={square ? '14' : '0'} fit="cover" placeholder={name ? name.split(' ')[0] : 'foto'} style={{ width: '100%', height: '100%' }}></image-slot>
          : (!src && a.initials)}
      </div>
      <AvatarBadge size={size} kind={b} level={level} />
    </div>
  );
}

// ---------- Showcase badges (max 3) ----------
function ShowcaseBadges({ keys = [], size = 18, max = 3 }) {
  const items = keys.slice(0, max).map(k => BADGES.find(b => b.key === k)).filter(Boolean);
  if (!items.length) return null;
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {items.map(b => (
        <div key={b.key} title={b.name} style={{
          width: size, height: size, borderRadius: 'var(--r-xs)',
          background: 'var(--surface-2)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', border: '1px solid var(--border)',
        }}>
          <Icon name={b.icon} size={size * 0.66} color={b.color} stroke={2.2} />
        </div>
      ))}
    </div>
  );
}

// ---------- Pronoun chip ----------
function PronounChip({ value }) {
  if (!value) return null;
  return <span style={{
    fontSize: 11, color: 'var(--text-3)', background: 'var(--surface-2)',
    padding: '1px 6px', borderRadius: 'var(--r-pill)', fontWeight: 600,
    border: '1px solid var(--border)', whiteSpace: 'nowrap',
  }}>{value}</span>;
}

// ---------- Name line (used everywhere) ----------
function NameLine({ player, size = 15, showPronoun = true, showBadges = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
      <span style={{ fontWeight: 700, fontSize: size, color: 'var(--text)', whiteSpace: 'nowrap' }}>{player.name}</span>
      {player.seasonChamp && <StatusMark kind="seasonChamp" size={size} />}
      {player.annualChamp && <StatusMark kind="annualChamp" size={size} />}
      {showPronoun && player.pronoun && <PronounChip value={player.pronoun} />}
      {showBadges && player.badges && <ShowcaseBadges keys={player.badges} size={size + 1} />}
    </div>
  );
}

// ---------- Button ----------
function Button({ children, variant = 'primary', size = 'md', icon, iconRight, arrow, full, onClick, disabled, style }) {
  const sizes = { sm: { h: 40, px: 16, fs: 14 }, md: { h: 52, px: 20, fs: 15 }, lg: { h: 58, px: 24, fs: 16 } };
  const s = sizes[size];
  const variants = {
    primary:   { background: 'var(--lime)', color: 'var(--on-lime)', border: '1.5px solid var(--border-strong)' },
    dark:      { background: 'var(--clay)', color: '#fff', border: '1.5px solid var(--border-strong)' },
    secondary: { background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border-strong)' },
    tonal:     { background: 'var(--lime-soft)', color: 'var(--clay-text)', border: '1.5px solid var(--border-strong)' },
    grass:     { background: 'var(--lime)', color: 'var(--on-lime)', border: '1.5px solid var(--border-strong)' },
    ghost:     { background: 'transparent', color: 'var(--text)', border: '1px solid transparent' },
    danger:    { background: 'transparent', color: 'var(--loss)', border: '1.5px solid color-mix(in srgb, var(--loss) 35%, transparent)' },
  };
  const arrowBg = variant === 'primary' || variant === 'grass' ? '#fff' : 'var(--clay)';
  const arrowFg = variant === 'primary' || variant === 'grass' ? 'var(--on-lime)' : '#fff';
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      height: s.h, padding: arrow ? `0 6px 0 ${s.px}px` : `0 ${s.px}px`, borderRadius: 'var(--r-pill)',
      fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: s.fs, cursor: disabled ? 'default' : 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: arrow ? 'space-between' : 'center', gap: 8,
      width: full ? '100%' : 'auto', opacity: disabled ? 0.4 : 1,
      transition: 'transform .08s, filter .15s', ...variants[variant], ...style,
    }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(.975)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
      {icon && <Icon name={icon} size={s.fs + 4} />}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{children}</span>
      {arrow && <span style={{ width: s.h - 12, height: s.h - 12, borderRadius: '50%', background: arrowBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="arrowRight" size={s.fs + 2} color={arrowFg} stroke={2.4} /></span>}
      {iconRight && !arrow && <Icon name={iconRight} size={s.fs + 4} />}
    </button>
  );
}

// ---------- Card ----------
function Card({ children, pad = 16, onClick, style, flat }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: pad,
      border: '1px solid var(--border)', boxShadow: flat ? 'none' : 'var(--shadow-sm)',
      cursor: onClick ? 'pointer' : 'default', ...style,
    }}>{children}</div>
  );
}

// ---------- Chip / Tag ----------
function Chip({ children, color = 'var(--text-2)', bg = 'var(--surface-2)', icon, size = 12, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: size, fontWeight: 700,
      color, background: bg, padding: '4px 9px', borderRadius: 'var(--r-pill)', whiteSpace: 'nowrap', ...style,
    }}>
      {icon && <Icon name={icon} size={size + 2} color={color} stroke={2.3} />}
      {children}
    </span>
  );
}

// ---------- Segmented control ----------
function Segmented({ options, value, onChange, size = 'md' }) {
  const h = size === 'sm' ? 38 : 44;
  return (
    <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 3, gap: 2 }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            flex: 1, height: h, borderRadius: 'var(--r-sm)', border: active ? '1.5px solid var(--text)' : '1.5px solid transparent', cursor: 'pointer',
            background: active ? 'var(--surface)' : 'transparent',
            color: active ? 'var(--text)' : 'var(--text-2)',
            fontWeight: 700, fontSize: size === 'sm' ? 13 : 14, fontFamily: 'var(--font-sans)',
            transition: 'all .15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap',
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

// ---------- Toggle ----------
function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 50, height: 30, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
      background: value ? 'var(--grass)' : 'var(--surface-3)', position: 'relative', transition: 'background .2s', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 3, left: value ? 23 : 3, width: 24, height: 24, borderRadius: '50%',
        background: '#fff', boxShadow: 'var(--shadow-sm)', transition: 'left .2s',
      }} />
    </button>
  );
}

// ---------- Checkbox / radio ----------
function CheckBox({ checked, shape = 'square' }) {
  return (
    <div style={{
      width: 24, height: 24, borderRadius: shape === 'circle' ? '50%' : 'var(--r-xs)',
      border: checked ? 'none' : '2px solid var(--border-strong)',
      background: checked ? 'var(--clay)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>{checked && <Icon name="check" size={15} color="#fff" stroke={3} />}</div>
  );
}

// ---------- List row ----------
function ListRow({ icon, iconColor, title, subtitle, right, onClick, danger, chevron }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', cursor: onClick ? 'pointer' : 'default',
    }}>
      {icon && (
        <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={icon} size={19} color={iconColor || (danger ? 'var(--loss)' : 'var(--text-2)')} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: danger ? 'var(--loss)' : 'var(--text)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right}
      {chevron && <Icon name="chevR" size={18} color="var(--text-3)" />}
    </div>
  );
}

// ---------- Text field ----------
function Field({ label, value, onChange, placeholder, type = 'text', icon, suffix, hint, autoFocus, big, error }) {
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>{label}</label>}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)',
        border: `1.5px solid ${error ? 'var(--loss)' : 'var(--border-strong)'}`, borderRadius: 'var(--r-md)',
        padding: big ? '0 16px' : '0 14px', height: big ? 58 : 50,
      }}>
        {icon && <Icon name={icon} size={20} color="var(--text-3)" />}
        <input value={value} onChange={e => onChange && onChange(e.target.value)} placeholder={placeholder} type={type} autoFocus={autoFocus}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: big ? 18 : 16,
            fontFamily: 'var(--font-sans)', color: 'var(--text)', fontWeight: big ? 600 : 500, minWidth: 0 }} />
        {suffix && <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 600 }}>{suffix}</span>}
      </div>
      {hint && <div style={{ fontSize: 12.5, color: error ? 'var(--loss)' : 'var(--text-3)', marginTop: 7 }}>{hint}</div>}
    </div>
  );
}

// ---------- Section header ----------
function SectionLabel({ children, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 10 }}>
      <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{children}</span>
      {action && <span onClick={onAction} style={{ fontSize: 13, fontWeight: 700, color: 'var(--clay)', cursor: 'pointer' }}>{action}</span>}
    </div>
  );
}

// ---------- Nav header ----------
function NavHeader({ title, subtitle, onBack, action, actionIcon, onAction, large, close }) {
  return (
    <div style={{ padding: large ? '6px 18px 4px' : '8px 14px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 48 }}>
      {onBack && (
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Icon name={close ? 'x' : 'back'} size={20} color="var(--text)" />
        </button>
      )}
      {!large && <div style={{ flex: 1, textAlign: onBack ? 'left' : 'center' }}>
        <div className="tc-display" style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{subtitle}</div>}
      </div>}
      {!large && action && (
        <button onClick={onAction} style={{ border: 'none', background: 'transparent', color: 'var(--clay)', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>{action}</button>
      )}
      {!large && actionIcon && (
        <button onClick={onAction} style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Icon name={actionIcon} size={20} color="var(--text)" />
        </button>
      )}
      {!onBack && !large && <div style={{ width: action || actionIcon ? 0 : 38 }} />}
      {large && (
        <div style={{ flex: 1 }}>
          <div className="tc-display tc-upper" style={{ fontWeight: 800, fontSize: 27, color: 'var(--text)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 4, fontWeight: 600 }}>{subtitle}</div>}
        </div>
      )}
      {large && actionIcon && (
        <button onClick={onAction} style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Icon name={actionIcon} size={21} color="var(--text)" />
        </button>
      )}
    </div>
  );
}

// ---------- Progress bar ----------
function Progress({ value, color = 'var(--clay)', height = 6 }) {
  return (
    <div style={{ height, background: 'var(--surface-3)', borderRadius: 'var(--r-pill)', overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: color, borderRadius: 'var(--r-pill)', transition: 'width .4s' }} />
    </div>
  );
}

// ---------- Bottom sheet ----------
function Sheet({ children, onClose, title }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,14,.4)', display: 'flex', alignItems: 'flex-end', zIndex: 50, animation: 'fadeIn .2s' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg)', width: '100%', borderRadius: '22px 22px 0 0', padding: '10px 18px 30px',
        border: '1.5px solid var(--border-strong)', borderBottom: 'none', maxHeight: '88%', overflowY: 'auto', animation: 'slideUp .28s cubic-bezier(.2,.8,.2,1)',
      }}>
        <div style={{ width: 38, height: 5, borderRadius: 3, background: 'var(--border-strong)', margin: '0 auto 14px' }} />
        {title && <div style={{ fontWeight: 800, fontSize: 19, marginBottom: 14, letterSpacing: '-.01em' }}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

// ---------- Modal (centered) ----------
function Modal({ children, onClose, dismissable = true }) {
  return (
    <div onClick={dismissable ? onClose : undefined} style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,14,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22, zIndex: 60, animation: 'fadeIn .2s' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', width: '100%', borderRadius: 'var(--r-xl)', border: '1.5px solid var(--border-strong)', overflow: 'hidden', animation: 'popIn .26s cubic-bezier(.2,.9,.3,1.1)' }}>{children}</div>
    </div>
  );
}

// ---------- Skeleton ----------
function Skel({ w = '100%', h = 14, r = 6, style }) {
  return <div className="tc-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// ---------- Empty state ----------
function EmptyState({ icon, title, body, action, onAction, secondary, onSecondary, tone = 'default', extra }) {
  const tint = tone === 'error' ? 'var(--loss)' : tone === 'offline' ? 'var(--warn)' : 'var(--text)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 32px', flex: 1, gap: 6 }}>
      <div style={{ position: 'relative', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <BallMark size={96} color={tone === 'default' ? 'var(--lime)' : `color-mix(in srgb, ${tint} 22%, var(--surface))`} />
        <div style={{ position: 'absolute', width: 40, height: 40, borderRadius: '50%', background: 'var(--surface)', border: `1.5px solid ${tone === 'default' ? 'var(--border-strong)' : tint}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={21} color={tint} stroke={2} />
        </div>
      </div>
      <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
      <div style={{ fontSize: 14.5, color: 'var(--text-2)', maxWidth: 260, lineHeight: 1.5 }}>{body}</div>
      {extra && <div style={{ marginTop: 12 }}>{extra}</div>}
      {(action || secondary) && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {secondary && <Button variant="secondary" size="md" onClick={onSecondary}>{secondary}</Button>}
          {action && <Button onClick={onAction} size="md">{action}</Button>}
        </div>
      )}
    </div>
  );
}

// ---------- ELO sparkline (tiny inline trend) ----------
function Sparkline({ data = [], color = 'var(--court)', w = 54, h = 18, stroke = 2 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), span = (max - min) || 1;
  const x = i => (i / (data.length - 1)) * w;
  const y = v => h - ((v - min) / span) * h;
  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const up = data[data.length - 1] >= data[0];
  const c = color === 'auto' ? (up ? 'var(--win)' : 'var(--loss)') : color;
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={c} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={2.4} fill={c} />
    </svg>
  );
}

// ---------- last-5 form (W/L) ----------
function FormDots({ form = [], size = 11, gap = 3 }) {
  return (
    <div style={{ display: 'flex', gap }}>
      {form.map((r, i) => (
        <span key={i} style={{ width: size, height: size, borderRadius: 3, background: r === 'W' ? 'var(--win)' : 'var(--loss)', border: i === form.length - 1 ? '1.5px solid var(--text)' : 'none' }} />
      ))}
    </div>
  );
}

// ---------- format color chip (consistent everywhere) ----------
function FormatChip({ fmtKey, size = 12, soft = true, icon = true }) {
  const f = (window.FORMATS || []).find(x => x.key === fmtKey);
  if (!f) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: size, fontWeight: 700, color: f.color, background: soft ? `color-mix(in srgb, ${f.color} 12%, transparent)` : 'transparent', border: `1.5px solid ${f.color}`, padding: '3px 9px', borderRadius: 'var(--r-pill)', whiteSpace: 'nowrap' }}>
      {icon && <Icon name={f.mark} size={size + 1} color={f.color} stroke={2.2} />}{f.name}
    </span>
  );
}

// ---------- count-up number ----------
function CountUp({ to, from = 0, dur = 850, className, style, format }) {
  const [v, setV] = useState(from);
  React.useEffect(() => {
    let raf, start;
    const tick = (t) => { if (!start) start = t; const p = Math.min(1, (t - start) / dur); const e = 1 - Math.pow(1 - p, 3); setV(Math.round(from + (to - from) * e)); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [to, from, dur]);
  return <span className={className} style={style}>{format ? format(v) : v}</span>;
}

// ---------- avatar with level-progress ring ----------
function LevelRing({ name, src, slot, size = 92, elo = 1500 }) {
  const lp = levelProgress(elo);
  const sw = Math.max(3, Math.round(size * 0.05));
  const r = (size - sw) / 2; const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={lp.cur.color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - lp.pct)} />
      </svg>
      <div style={{ position: 'absolute', inset: sw + 3, borderRadius: '50%', overflow: 'hidden' }}>
        <Avatar name={name} src={src} slot={slot} round noBorder size={size - (sw + 3) * 2} />
      </div>
    </div>
  );
}

// ---------- Photo slot (user-fillable) ----------
function Photo({ id, h = 200, radius = 22, mask, fit = 'cover', placeholder = 'fotoğraf', style }) {
  const props = { id, shape: 'rounded', radius: String(radius), fit, placeholder,
    style: { width: '100%', height: typeof h === 'number' ? h + 'px' : h, ...style } };
  if (mask) props.mask = mask;
  return React.createElement('image-slot', props);
}

// ---------- Search bar (pill) ----------
function SearchBar({ placeholder = 'Ara…', onClick, value, onChange }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 11, height: 54, padding: '0 18px', background: 'var(--surface)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-pill)', cursor: onClick ? 'pointer' : 'text' }}>
      <Icon name="search" size={20} color="var(--text-3)" />
      {onClick
        ? <span style={{ flex: 1, fontSize: 15, color: 'var(--text-3)', fontWeight: 500 }}>{placeholder}</span>
        : <input value={value} onChange={e => onChange && onChange(e.target.value)} placeholder={placeholder} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, fontFamily: 'var(--font-sans)', color: 'var(--text)', fontWeight: 500 }} />}
    </div>
  );
}

// ---------- Info chip (outlined label/value box) ----------
function InfoChip({ icon, label, value, accent }) {
  return (
    <div style={{ flex: 1, border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-md)', padding: '12px 12px', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
        <Icon name={icon} size={15} color={accent || 'var(--text-3)'} />
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '.06em' }}>{label}</span>
      </div>
      <div className="num" style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{value}</div>
    </div>
  );
}

// ---------- Decorative badge burst (scalloped) ----------
function BadgeBurst({ size = 56, color = 'var(--lime)', children, spin }) {
  const pts = 12, r1 = 50, r2 = 41;
  let d = '';
  for (let i = 0; i < pts * 2; i++) {
    const a = (Math.PI / pts) * i, r = i % 2 ? r2 : r1;
    d += (i ? 'L' : 'M') + (50 + r * Math.cos(a)).toFixed(1) + ' ' + (50 + r * Math.sin(a)).toFixed(1) + ' ';
  }
  d += 'Z';
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ position: 'absolute', inset: 0, animation: spin ? 'spinSlow 14s linear infinite' : 'none' }}><path d={d} fill={color} /></svg>
      <div style={{ position: 'relative', color: 'var(--on-lime)', fontWeight: 800, fontSize: size * 0.22, textAlign: 'center', lineHeight: 1, fontFamily: 'var(--font-display)' }}>{children}</div>
    </div>
  );
}

// ---------- 4-point sparkle star ----------
function Sparkle({ size = 30, color = 'var(--surface)', stroke = 'var(--text)' }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <path d="M50 4 C54 34 66 46 96 50 C66 54 54 66 50 96 C46 66 34 54 4 50 C34 46 46 34 50 4 Z" fill={color} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

// ---------- Star rating ----------
function Rating({ value = 5, count, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <Icon name="star" size={size + 2} color="var(--star)" fill="var(--star)" stroke={1} />
      <span className="num" style={{ fontWeight: 800, fontSize: size, color: 'var(--text)' }}>{value.toFixed(1)}</span>
      {count != null && <span style={{ fontSize: size - 1.5, color: 'var(--text-3)', fontWeight: 600 }}>({count} maç)</span>}
    </span>
  );
}

// ---------- Greeting header (Hello + avatar + bell) ----------
function GreetHeader({ name, sub, onBell, badge, avatar = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 20px 4px' }}>
      {avatar && <Avatar name={name} size={42} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 16, fontFamily: 'var(--font-display)' }}>Merhaba {name.split(' ')[0]}!</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 600 }}>{sub}</div>
      </div>
      <button onClick={onBell} style={{ position: 'relative', width: 44, height: 44, borderRadius: '50%', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <Icon name="bell" size={20} color="var(--text)" />
        {badge && <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', border: '1.5px solid var(--surface)' }} />}
      </button>
    </div>
  );
}

Object.assign(window, {
  cx, Avatar, ShowcaseBadges, PronounChip, NameLine, Button, Card, Chip, Segmented,
  Toggle, CheckBox, ListRow, Field, SectionLabel, NavHeader, Progress, Sheet, Modal, Skel, EmptyState,
  Photo, SearchBar, InfoChip, BadgeBurst, Sparkle, Rating, GreetHeader,
  Sparkline, FormDots, FormatChip, CountUp, LevelRing,
});
