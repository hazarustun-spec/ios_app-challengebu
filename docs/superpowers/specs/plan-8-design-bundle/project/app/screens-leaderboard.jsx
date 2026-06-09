/* global React, window, useApp, Icon, NavHeader, Avatar, NameLine, Chip, Segmented, Sheet, Button, Toggle, CheckBox, EmptyState, LevelIcon, levelForElo, CATEGORIES, LEADERBOARD, ME, BADGES */
// ============================================================
// LEADERBOARD  (screens 17-20)
// ============================================================
const { useState: lS } = React;

function CatChips({ value, onChange }) {
  return (
    <div className="scroll-x" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 18px 4px' }}>
      {CATEGORIES.map(c => { const on = c.key === value; const myr = MY_CAT_RANKS[c.key]; return (
        <button key={c.key} onClick={() => onChange(c.key)} style={{
          flexShrink: 0, padding: '11px 15px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
          border: `1.5px solid ${on ? 'transparent' : 'var(--border)'}`, background: on ? 'var(--text)' : 'var(--surface)',
          color: on ? 'var(--bg)' : 'var(--text-2)', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap',
          display: 'inline-flex', alignItems: 'center', gap: 7,
        }}>
          {c.label}
          {myr && <span className="num" style={{ fontSize: 10.5, fontWeight: 800, color: on ? 'var(--court)' : 'var(--text-3)', background: on ? '#fff' : 'var(--surface-2)', padding: '1px 6px', borderRadius: 'var(--r-pill)' }}>#{myr}</span>}
        </button>
      ); })}
    </div>
  );
}

function RankRow({ p, onClick, me }) {
  const lv = levelForElo(p.elo);
  const delta = (p.rank % 3 === 0) ? -1 : (p.rank % 2 === 0 ? 2 : 0);
  const frozen = p.status === 'frozen';
  const medalC = p.rank <= 3 ? ['#C9982E', '#9AA0A6', '#B0743A'][p.rank - 1] : null;
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', cursor: 'pointer',
      background: me ? 'var(--clay-softer)' : 'var(--surface)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-strong)', opacity: frozen ? 0.72 : 1 }}>
      <div style={{ width: 22, textAlign: 'center', flexShrink: 0 }}>
        <span className="num" style={{ fontWeight: medalC ? 800 : 700, fontSize: medalC ? 18 : 16, color: medalC || 'var(--text-3)' }}>{p.rank}</span>
      </div>
      <div style={{ flexShrink: 0 }}><Avatar name={p.name} size={42} status={p.status} round /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <NameLine player={p} size={14.5} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
          {frozen
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 800, color: 'var(--frozen)', background: 'var(--frozen-soft)', padding: '2px 7px', borderRadius: 'var(--r-pill)' }}><Icon name="snow" size={10} color="var(--frozen)" stroke={2.4} />Donmuş</span>
            : <><LevelIcon level={lv} size={13} /><span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{lv.name}</span></>}
          <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>· {p.wl[0]}G {p.wl[1]}M</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, opacity: frozen ? 0.5 : 1 }}>
        <Sparkline data={eloTrend(p)} color="auto" w={46} h={15} />
        <FormDots form={formFor(p)} size={9} gap={2.5} />
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 44 }}>
        <div className="num" style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-.02em', color: frozen ? 'var(--text-3)' : 'var(--text)' }}>{p.elo}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end', marginTop: 1 }}>
          {delta !== 0 && <Icon name={delta > 0 ? 'chevU' : 'chevD'} size={12} color={delta > 0 ? 'var(--win)' : 'var(--loss)'} stroke={3} />}
          <span className="num" style={{ fontSize: 11.5, fontWeight: 700, color: delta > 0 ? 'var(--win)' : delta < 0 ? 'var(--loss)' : 'var(--text-3)' }}>{delta === 0 ? '—' : Math.abs(delta)}</span>
        </div>
      </div>
    </div>
  );
}

function Leaderboard({ params }) {
  const { nav } = useApp();
  const [cat, setCat] = lS(params.cat || 'erkek_tek');
  const [stuck, setStuck] = lS(false);
  const list = LEADERBOARD[cat] || [];
  const catObj = CATEGORIES.find(c => c.key === cat);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <NavHeader large title="Sıralama" subtitle="Güz Sezonu · 41 gün kaldı" actionIcon="filter" onAction={() => nav.go('lb_filter', { cat })} />
      <div style={{ marginTop: 4 }}><CatChips value={cat} onChange={setCat} /></div>
      <button onClick={() => nav.go('season')} style={{ margin: '8px 14px 2px', position: 'relative', overflow: 'hidden', display: 'block', width: 'auto', textAlign: 'left', background: 'var(--court)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-lg)', padding: '14px 16px 13px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
        <Icon name="trophy" size={150} color="rgba(255,255,255,.12)" stroke={1.6} style={{ position: 'absolute', right: -28, bottom: -36, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse 1.4s infinite' }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', color: 'rgba(255,255,255,.72)' }}>FİNALE GERİ SAYIM</span>
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.06em', color: '#fff', border: '1.5px solid rgba(255,255,255,.55)', padding: '5px 10px', borderRadius: 'var(--r-pill)' }}>İLK 8’DESİN</span>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 12 }}>
          <span className="num" style={{ fontWeight: 800, fontSize: 46, lineHeight: .9, color: '#fff', letterSpacing: '-.03em' }}>41</span>
          <span style={{ fontWeight: 800, fontSize: 17, color: '#fff' }}>gün</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.72)', marginLeft: 4 }}>· final 16–25 Oca</span>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ height: 7, borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,.22)', overflow: 'hidden' }}>
            <div style={{ width: '70%', height: '100%', background: '#fff', borderRadius: 'var(--r-pill)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.78)' }}>Güz Sezonu · ladder</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 3 }}>Sezona git <Icon name="chevR" size={13} color="#fff" /></span>
          </div>
        </div>
      </button>

      {list.length === 0 ? (
        <EmptyState icon="matches" title={`${catObj.label} henüz boş`} body="Bu kategoride sıralamaya girmek için bir çift oluştur ve ilk maçını oyna." action="Çift maçı oluştur" onAction={() => nav.go('new_match_type')} />
      ) : (
        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {stuck && (
            <div onClick={() => nav.go('profile')} style={{ position: 'absolute', top: 6, left: 14, right: 14, zIndex: 6, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 13px', background: 'var(--clay-softer)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-pill)', cursor: 'pointer', animation: 'slideUp .2s' }}>
              <span className="num" style={{ fontWeight: 800, fontSize: 15, color: 'var(--court)', minWidth: 22, textAlign: 'center' }}>#4</span>
              <Avatar name={ME.name} size={28} />
              <span style={{ flex: 1, fontWeight: 700, fontSize: 13 }}>Sen · sıralamadaki yerin</span>
              <span className="num" style={{ fontWeight: 800, fontSize: 14 }}>1612</span>
              <span className="num" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--win)', display: 'flex', alignItems: 'center', gap: 1 }}><Icon name="chevU" size={11} color="var(--win)" stroke={3} />22</span>
            </div>
          )}
        <div className="scroll-y" onScroll={e => setStuck(e.currentTarget.scrollTop > 210)} style={{ flex: 1, minHeight: 0, padding: '12px 14px 24px' }}>
          {/* your standing — outlined, lets the blue countdown be the single hero */}
          <div style={{ marginBottom: 14, background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 13, border: '1.5px solid var(--border-strong)' }}>
            <div style={{ textAlign: 'center', minWidth: 30 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.12em', color: 'var(--court)' }}>SEN</div>
              <div className="num" style={{ fontWeight: 800, fontSize: 28, lineHeight: 1, color: 'var(--text)' }}>4</div>
            </div>
            <Avatar name={ME.name} size={46} ring="var(--court)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="tc-display" style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', whiteSpace: 'nowrap' }}>{ME.name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                <span className="num" style={{ fontSize: 11.5, fontWeight: 800, color: '#fff', background: 'var(--court)', padding: '3px 9px', borderRadius: 'var(--r-pill)' }}>1612 ELO</span>
                <span className="num" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--win)', background: 'var(--grass-soft)', padding: '3px 9px', borderRadius: 'var(--r-pill)' }}>▲ 22</span>
              </div>
            </div>
            <Icon name="chevR" size={18} color="var(--text-3)" />
          </div>
          {/* podium top-3 strip */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {list.slice(0, 3).map((p, i) => { const lv = levelForElo(p.elo); return (
              <div key={p.name} onClick={() => nav.go('player_preview', { name: p.name, cat })} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px 8px', textAlign: 'center', cursor: 'pointer', position: 'relative', order: i === 0 ? 2 : i === 1 ? 1 : 3, marginTop: i === 0 ? 0 : 10 }}>
                <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', width: 22, height: 22, borderRadius: '50%', background: ['#C9982E', '#9AA0A6', '#B0743A'][i], color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="num">{i + 1}</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6, marginBottom: 6 }}><Avatar name={p.name} size={i === 0 ? 52 : 44} status={p.status} ring={i === 0 ? '#C9982E' : undefined} /></div>
                <div style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name.split(' ')[0]}</div>
                <div className="num" style={{ fontWeight: 700, fontSize: 15, color: lv.color, marginTop: 2 }}>{p.elo}</div>
              </div>
            ); })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.slice(3).map(p => <RankRow key={p.name} p={p} me={p.name === 'Mert Şahin'} onClick={() => nav.go('player_preview', { name: p.name, cat })} />)}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

// ---------- Filter panel (19) ----------
function FilterPanel({ params }) {
  const { nav } = useApp();
  const [lo, setLo] = lS(1100); const [hi, setHi] = lS(1950);
  const [avail, setAvail] = lS(['wd_eve']);
  const [frozen, setFrozen] = lS(true); const [hib, setHib] = lS(false);
  const slots = [['wd_am', 'Hafta içi sabah'], ['wd_eve', 'Hafta içi akşam'], ['we_am', 'Hafta sonu sabah'], ['we_eve', 'Hafta sonu akşam']];
  const toggle = k => setAvail(a => a.includes(k) ? a.filter(x => x !== k) : [...a, k]);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Filtrele" action="Sıfırla" onAction={() => { setLo(1100); setHi(1950); setAvail([]); setFrozen(true); setHib(false); }} />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 20px 20px' }}>
        <div style={{ marginBottom: 26 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>ELO aralığı</span>
            <span className="num" style={{ fontWeight: 700, color: 'var(--clay)' }}>{lo} – {hi}</span>
          </div>
          <input type="range" min="900" max="2000" step="10" value={lo} onChange={e => setLo(Math.min(+e.target.value, hi - 50))} style={{ width: '100%', accentColor: 'var(--clay)' }} />
          <input type="range" min="900" max="2000" step="10" value={hi} onChange={e => setHi(Math.max(+e.target.value, lo + 50))} style={{ width: '100%', accentColor: 'var(--clay)' }} />
        </div>
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Müsaitlik</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {slots.map(([k, l]) => { const on = avail.includes(k); return (
              <button key={k} onClick={() => toggle(k)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px', borderRadius: 'var(--r-md)', border: `1.5px solid ${on ? 'var(--grass)' : 'var(--border-strong)'}`, background: on ? 'var(--grass-soft)' : 'var(--surface)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                <CheckBox checked={on} /><span style={{ fontWeight: 700, fontSize: 12.5, textAlign: 'left', lineHeight: 1.2 }}>{l}</span>
              </button>
            ); })}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label onClick={() => setFrozen(!frozen)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', cursor: 'pointer' }}>
            <Icon name="snow" size={20} color="var(--frozen)" />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14.5 }}>Donmuş oyuncular</div><div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>❄️ 30+ gündür inaktif</div></div>
            <Toggle value={frozen} onChange={setFrozen} />
          </label>
          <label onClick={() => setHib(!hib)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', cursor: 'pointer' }}>
            <Icon name="moon" size={20} color="var(--text-2)" />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14.5 }}>Hibernasyondakiler</div><div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Sezon arası dinlenenler</div></div>
            <Toggle value={hib} onChange={setHib} />
          </label>
        </div>
      </div>
      <div style={{ padding: '8px 20px 26px' }}>
        <Button full size="lg" onClick={() => { nav.toast('Filtre uygulandı'); nav.back(); }}>42 oyuncu göster</Button>
      </div>
    </div>
  );
}

// ---------- Player preview (20) ----------
function PlayerPreview({ params }) {
  const { nav } = useApp();
  const cat = params.cat || 'erkek_tek';
  const p = (LEADERBOARD[cat] || []).find(x => x.name === params.name) || LEADERBOARD.erkek_tek[0];
  const lv = levelForElo(p.elo);
  const stats = [['Rank', '#' + p.rank], ['Galibiyet', p.wl[0]], ['Mağlubiyet', p.wl[1]], ['Seri', p.streak || '—']];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} close title="Oyuncu" />
      <div className="scroll-y" style={{ flex: 1, padding: '4px 20px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8, paddingTop: 6 }}>
          <Avatar name={p.name} size={92} status={p.status} ring={lv.color} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>{p.name}</h1>
            {p.seasonChamp && <Icon name="crown" size={20} color="#C9982E" />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 'var(--r-pill)', fontWeight: 600 }}>{p.pronoun}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><LevelIcon level={lv} size={16} /><span style={{ fontWeight: 700, fontSize: 13.5, color: lv.color }}>{lv.name}</span></div>
          </div>
          {p.dept && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{p.dept} · {p.year}. sınıf</div>}
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '20px 0' }}>
          {stats.map(([l, v]) => (
            <div key={l} style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '12px 4px', textAlign: 'center' }}>
              <div className="num" style={{ fontWeight: 700, fontSize: 19 }}>{v}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 600 }}>Mevcut ELO</div><div className="num" style={{ fontWeight: 800, fontSize: 26, color: lv.color }}>{p.elo}</div></div>
          <div style={{ display: 'flex', gap: 4 }}>{p.badges.slice(0, 3).map(k => { const b = BADGES.find(x => x.key === k); return b && <div key={k} style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={b.icon} size={18} color={b.color} /></div>; })}</div>
        </div>

        {p.status === 'frozen' && (
          <div style={{ display: 'flex', gap: 10, padding: 13, background: 'var(--frozen-soft)', borderRadius: 'var(--r-md)', marginTop: 12 }}>
            <Icon name="snow" size={18} color="var(--frozen)" />
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.45 }}>Bu oyuncu <b>donmuş</b> durumda (30+ gündür inaktif). Meydan okuman onu yeniden aktifleştirir.</p>
          </div>
        )}
      </div>
      <div style={{ padding: '8px 20px 26px', display: 'flex', gap: 10 }}>
        <Button variant="secondary" size="lg" icon="user" onClick={() => nav.toast('Profil açıldı')} style={{ flex: 1 }}>Profil</Button>
        <Button size="lg" icon="bolt" onClick={() => nav.go('new_match_detail', { opponent: p.name })} style={{ flex: 2 }}>Meydan oku</Button>
      </div>
    </div>
  );
}

registerScreens([
  { id: 'leaderboard', group: 'Sıralama', title: 'Sıralama', comp: Leaderboard, tab: 'ranking' },
  { id: 'lb_filter', group: 'Sıralama', title: 'Filtre paneli', comp: FilterPanel },
  { id: 'player_preview', group: 'Sıralama', title: 'Oyuncu önizleme', comp: PlayerPreview },
]);
