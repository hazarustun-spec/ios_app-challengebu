/* global React, ReactDOM, window, SCREENS, SCREEN_ORDER, PhoneFrame, StatusBar, TabBar, TABS, Directory, AppCtx, Icon */
// ============================================================
// App root — router, theme, sheet/modal/toast host
// ============================================================
const { useState: uS, useCallback: uC, useEffect: uE } = React;

function App() {
  const [stack, setStack] = uS(() => {
    try { const s = JSON.parse(localStorage.getItem('tc_stack')); if (s && s.length) return s; } catch (e) {}
    return [{ id: 'splash', params: {} }];
  });
  const [sheet, setSheet] = uS(null);
  const [modal, setModal] = uS(null);
  const [toast, setToast] = uS(null);
  const [dirOpen, setDirOpen] = uS(false);
  const [scale, setScale] = uS(1);

  uE(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 150) / 852));
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit);
  }, []);

  uE(() => { localStorage.setItem('tc_stack', JSON.stringify(stack.slice(-12))); }, [stack]);

  const top = stack[stack.length - 1];
  const meta = SCREENS[top.id] || SCREENS.splash;

  const nav = {
    go: uC((id, params = {}) => setStack(s => [...s, { id, params }]), []),
    replace: uC((id, params = {}) => setStack(s => [...s.slice(0, -1), { id, params }]), []),
    back: uC(() => setStack(s => s.length > 1 ? s.slice(0, -1) : s), []),
    reset: uC((id, params = {}) => setStack([{ id, params }]), []),
    sheet: uC((node) => setSheet(() => node), []),
    closeSheet: uC(() => setSheet(null), []),
    modal: uC((node) => setModal(() => node), []),
    closeModal: uC(() => setModal(null), []),
    toast: uC((msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); }, []),
  };

  const onTab = (t) => { setSheet(null); setModal(null); nav.reset(t.screen); };
  const jump = (id) => { setDirOpen(false); setSheet(null); setModal(null); nav.reset(id); };

  const Comp = meta.comp;
  const showTab = !!meta.tab;
  const dark = false;

  return (
    <AppCtx.Provider value={{ nav, theme: 'light', setTheme: () => {}, dark }}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '28px 16px' }}>
        {/* external toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => setDirOpen(true)} className="ext-btn">
            <Icon name="grid" size={17} color="#fff" /> Ekran Dizini
          </button>
          <div className="ext-pill num">{String(SCREEN_ORDER.indexOf(top.id) + 1).padStart(2, '0')} · {meta.title}</div>
        </div>

        <div style={{ height: 852 * scale, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
            <PhoneFrame theme="light" dark={false}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }} data-theme="light" className="tc-screen">
            {!meta.noStatus && <StatusBar dark={false} />}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
              <Comp params={top.params} key={top.id + stack.length} />
            </div>
            {showTab && <TabBar active={meta.tab} onTab={onTab} />}
            {sheet}
            {modal}
            {toast && (
              <div style={{ position: 'absolute', bottom: showTab ? 100 : 30, left: '50%', transform: 'translateX(-50%)', background: 'var(--text)', color: 'var(--bg)', padding: '11px 18px', borderRadius: 'var(--r-pill)', fontWeight: 700, fontSize: 13.5, boxShadow: 'var(--shadow-lg)', zIndex: 80, whiteSpace: 'nowrap', animation: 'slideUp .3s' }}>{toast}</div>
            )}
          </div>
        </PhoneFrame>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#8a857c', fontFamily: 'var(--font-sans)' }}>Tennis Challenger · prototip · ← gerçek navigasyon →</div>
      </div>
      {dirOpen && <Directory onJump={jump} onClose={() => setDirOpen(false)} current={top.id} />}
    </AppCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
