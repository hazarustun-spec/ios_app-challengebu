/* global React, window, Icon, CATEGORIES */
// ============================================================
// App shell — phone frame, router, status bar, tab bar, directory
// ============================================================
const { useState, useCallback, createContext, useContext, useEffect } = React;

const SCREENS = {};        // id -> { id, group, title, comp, tab, noChrome, dark }
const SCREEN_ORDER = [];
function registerScreens(list) {
  list.forEach(s => { if (!SCREENS[s.id]) SCREEN_ORDER.push(s.id); SCREENS[s.id] = s; });
}
window.registerScreens = registerScreens;
window.SCREENS = SCREENS;

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);
window.useApp = () => useContext(AppCtx);

// ---------- Status bar ----------
function StatusBar({ dark }) {
  const c = dark ? '#F3F1EA' : '#1B1A16';
  return (
    <div style={{ height: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 26px 8px', flexShrink: 0, position: 'relative', zIndex: 5 }}>
      <span className="num" style={{ fontWeight: 700, fontSize: 15.5, color: c, letterSpacing: '0' }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="18" height="12" viewBox="0 0 18 12" fill={c}><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="5" y="4.5" width="3" height="7.5" rx="1"/><rect x="10" y="2" width="3" height="10" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill={c}><path d="M8.5 2.5c2.3 0 4.4.9 6 2.4l-1.3 1.3a6.6 6.6 0 0 0-9.4 0L2.5 4.9A8.6 8.6 0 0 1 8.5 2.5zM8.5 6c1.2 0 2.3.5 3.1 1.3l-3.1 3.1-3.1-3.1A4.4 4.4 0 0 1 8.5 6z"/></svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 23, height: 12, borderRadius: 3, border: `1.5px solid ${c}`, opacity: .55, position: 'relative', padding: 1.5 }}>
            <div style={{ width: '78%', height: '100%', background: c, borderRadius: 1 }} />
          </div>
          <div style={{ width: 1.5, height: 4, background: c, borderRadius: 1, opacity: .55 }} />
        </div>
      </div>
    </div>
  );
}

// ---------- Tab bar ----------
const TABS = [
  { tab: 'ranking',  icon: 'ranking',  label: 'Sıralama', screen: 'leaderboard' },
  { tab: 'matches',  icon: 'matches',  label: 'Maçlar',   screen: 'matches_upcoming' },
  { tab: 'new',      icon: 'plus',     label: '',         screen: 'new_match_type' },
  { tab: 'notifs',   icon: 'bell',     label: 'Bildirim', screen: 'notifs', badge: 3 },
  { tab: 'profile',  icon: 'user',     label: 'Profil',   screen: 'profile' },
];
function TabBar({ active, onTab }) {
  return (
    <div style={{ flexShrink: 0, padding: '6px 18px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', background: 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--lime)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-pill)', padding: '8px 12px', height: 64 }}>
        {TABS.map(t => {
          const on = active === t.tab;
          const isNew = t.tab === 'new';
          return (
            <button key={t.tab} onClick={() => onTab(t)} style={{ border: isNew ? '2px solid var(--surface)' : 'none', background: (isNew || on) ? 'var(--clay)' : 'transparent', cursor: 'pointer', width: isNew ? 52 : 48, height: isNew ? 52 : 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'background .2s' }}>
              <Icon name={t.icon} size={isNew ? 25 : 23} color={(isNew || on) ? '#fff' : 'var(--on-lime)'} stroke={isNew ? 2.7 : (on ? 2.4 : 2.1)} />
              {t.badge && !on && <span style={{ position: 'absolute', top: 6, right: 7, minWidth: 15, height: 15, padding: '0 4px', borderRadius: 8, background: 'var(--pink-deep)', color: '#fff', fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--lime)' }}>{t.badge}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Screen directory overlay ----------
const GROUPS = ['Auth & Onboarding', 'Sıralama', 'Maçlar', 'Profil & Gamification', 'Sezon & Turnuva', 'Bildirimler', 'Admin', 'Sistem'];
function Directory({ onJump, onClose, current }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,9,7,.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn .2s' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', color: 'var(--text)', borderRadius: 18, width: 'min(880px, 96vw)', maxHeight: '88vh', overflowY: 'auto', boxShadow: 'var(--shadow-pop)', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-.02em' }}>Ekran Dizini</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{SCREEN_ORDER.length} ekran · herhangi birine atla</div>
          </div>
          <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={20} /></button>
        </div>
        {GROUPS.map(g => {
          const items = SCREEN_ORDER.map(id => SCREENS[id]).filter(s => s.group === g);
          if (!items.length) return null;
          return (
            <div key={g} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>{g}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                {items.map((s, i) => (
                  <button key={s.id} onClick={() => onJump(s.id)} style={{
                    textAlign: 'left', padding: '10px 12px', borderRadius: 11, cursor: 'pointer',
                    border: `1.5px solid ${current === s.id ? 'var(--clay)' : 'var(--border)'}`,
                    background: current === s.id ? 'var(--clay-softer)' : 'var(--surface)',
                    fontFamily: 'var(--font-sans)', color: 'var(--text)',
                  }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', marginBottom: 2 }} className="num">{String(SCREEN_ORDER.indexOf(s.id) + 1).padStart(2, '0')}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{s.title}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Phone frame ----------
function PhoneFrame({ theme, children, dark }) {
  return (
    <div data-theme={dark ? 'dark' : theme} style={{
      width: 393, height: 852, borderRadius: 54, padding: 0, position: 'relative', flexShrink: 0,
      background: 'var(--bg)', boxShadow: '0 0 0 12px #1a1a1c, 0 0 0 14px #2c2c2e, 0 50px 100px rgba(0,0,0,.5)',
      overflow: 'hidden',
    }} className="tc-screen">
      <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 124, height: 35, background: '#000', borderRadius: 20, zIndex: 100 }} />
      {children}
    </div>
  );
}

window.StatusBar = StatusBar;
window.TabBar = TabBar;
window.TABS = TABS;
window.Directory = Directory;
window.PhoneFrame = PhoneFrame;
window.AppCtx = AppCtx;
window.useApp = useApp;
