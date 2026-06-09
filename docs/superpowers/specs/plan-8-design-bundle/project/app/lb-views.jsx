/* global React, window, Icon, Avatar, LevelIcon, levelForElo, NavHeader, CATEGORIES, LEADERBOARD, ME, StatusBar, TabBar */
// ============================================================
// LEADERBOARD — alternatif görünüm opsiyonları (design canvas)
// Reuses the live design system: ink/lime/cobalt tokens, Space Grotesk
// numerals, big rounded cards, dark-pill nav, outlined pill chips.
// ============================================================

const LIST = LEADERBOARD.erkek_tek;           // rank 1..12
const MEDAL = ['#C9982E', '#9AA0A6', '#B0743A']; // gold / silver / bronze (on light)
const MEDAL_HI = ['#F4D06A', '#DDE3EA', '#E7AE79']; // brighter tints for court-blue panels
const COURT = 'var(--court)';                 // flat court blue (no gradient)
const INK = 'var(--border-strong)';           // crisp black outline
const WIRE = 'rgba(255,255,255,.55)';          // white outline (on dark panels)

// deterministic weekly rank movement (mirrors the prototype's playful deltas)
const DELTA = {
  'Kaan Demir': 0, 'Emre Yıldız': 1, 'Berk Aydın': -1, 'Mert Şahin': 2,
  'Can Öztürk': 0, 'Deniz Arslan': -1, 'Ali Koç': 0, 'Onur Çelik': 3,
  'Burak Kaya': -2, 'Eren Doğan': 1, 'Tolga Aksoy': 0, 'Sinan Polat': -1,
};

// last-5 form, weighted by win rate, deterministic per name
function formFor(p) {
  let h = 0; for (const c of p.name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const wr = p.wl[0] / (p.wl[0] + p.wl[1]);
  const out = [];
  for (let i = 0; i < 5; i++) { h = (h * 1103515245 + 12345) >>> 0; out.push(((h >>> 16) & 255) / 255 < wr ? 'W' : 'L'); }
  return out;
}

// ---------- shared atoms ----------
function Delta({ d, size = 11.5 }) {
  if (!d) return <span className="num" style={{ fontSize: size, fontWeight: 700, color: 'var(--text-3)' }}>—</span>;
  const up = d > 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <Icon name={up ? 'chevU' : 'chevD'} size={size + 1} color={up ? 'var(--win)' : 'var(--loss)'} stroke={3} />
      <span className="num" style={{ fontSize: size, fontWeight: 700, color: up ? 'var(--win)' : 'var(--loss)' }}>{Math.abs(d)}</span>
    </span>
  );
}

function FormDots({ form, size = 13, gap = 4 }) {
  return (
    <div style={{ display: 'flex', gap }}>
      {form.map((r, i) => (
        <span key={i} style={{
          width: size, height: size, borderRadius: 3,
          background: r === 'W' ? 'var(--win)' : 'var(--loss)',
          border: i === form.length - 1 ? '1.5px solid var(--text)' : 'none',
        }} />
      ))}
    </div>
  );
}

function Chips() {
  return (
    <div style={{ display: 'flex', gap: 8, overflow: 'hidden', padding: '2px 18px 4px' }}>
      {CATEGORIES.slice(0, 4).map((c, i) => {
        const on = i === 0;
        return (
          <div key={c.key} style={{
            flexShrink: 0, padding: '9px 15px', borderRadius: 'var(--r-pill)',
            border: `1.5px solid ${on ? 'var(--text)' : INK}`,
            background: on ? 'var(--text)' : 'var(--surface)',
            color: on ? 'var(--bg)' : 'var(--text-2)', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap',
          }}>{c.label}</div>
        );
      })}
    </div>
  );
}

// slim "your standing" pinned bar (lime-tinted)
function YouBar({ note = '17G 9M' }) {
  return (
    <div style={{ margin: '10px 14px 2px', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--clay-softer)', border: `1.5px solid ${INK}`, borderRadius: 'var(--r-md)' }}>
      <div style={{ textAlign: 'center', minWidth: 24 }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.12em', color: 'var(--clay-text)' }}>SEN</div>
        <div className="num" style={{ fontWeight: 800, fontSize: 20, lineHeight: 1 }}>4</div>
      </div>
      <Avatar name={ME.name} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{ME.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>Çaylak · {note}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="num" style={{ fontWeight: 800, fontSize: 17 }}>{ME.elo}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end', marginTop: 1 }}>
          <Icon name="chevU" size={12} color="var(--win)" stroke={3} />
          <span className="num" style={{ fontSize: 11, fontWeight: 700, color: 'var(--win)' }}>22</span>
        </div>
      </div>
    </div>
  );
}

// ---------- flat tab bar (no shadow, black outline) ----------
function FlatTabBar() {
  const items = [['ranking', true], ['matches', false], ['plus', false], ['bell', false, 3], ['user', false]];
  return (
    <div style={{ flexShrink: 0, padding: '6px 18px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--lime)', border: `1.5px solid ${INK}`, borderRadius: 'var(--r-pill)', padding: '8px 12px', height: 64 }}>
        {items.map(([icon, on, badge]) => (
          <div key={icon} style={{ background: on ? 'var(--clay)' : 'transparent', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Icon name={icon} size={23} color={on ? '#fff' : 'var(--on-lime)'} stroke={on ? 2.4 : 2.1} />
            {badge && !on && <span className="num" style={{ position: 'absolute', top: 4, right: 5, minWidth: 15, height: 15, padding: '0 4px', borderRadius: 8, background: 'var(--pink-deep)', color: '#fff', fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--lime)' }}>{badge}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- phone surface wrapper ----------
function Screen({ dark, children }) {
  return (
    <div data-theme={dark ? 'dark' : 'light'} className="tc-screen" style={{ width: 393, height: 852, display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 124, height: 35, background: '#000', borderRadius: 20, zIndex: 100 }} />
      <StatusBar dark={dark} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{children}</div>
      <FlatTabBar />
    </div>
  );
}

function Head() {
  return <NavHeader large title="Sıralama" subtitle="Güz Sezonu · 41 gün kaldı" actionIcon="filter" onAction={() => {}} />;
}

// ============================================================
// A · KOMPAKT LİSTE — dense, scannable single column
// ============================================================
function CompactRow({ p }) {
  const lv = levelForElo(p.elo);
  const medal = p.rank <= 3 ? MEDAL[p.rank - 1] : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: `1px solid ${INK}` }}>
      <div style={{ width: 22, textAlign: 'center', flexShrink: 0 }}>
        <span className="num" style={{ fontWeight: 800, fontSize: medal ? 16 : 15, color: medal || 'var(--text-3)' }}>{p.rank}</span>
      </div>
      <Avatar name={p.name} size={36} status={p.status} ring={medal || undefined} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
          <LevelIcon level={lv} size={12} />
          <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>{lv.name}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="num" style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-.02em' }}>{p.elo}</div>
        <div style={{ marginTop: 1 }}><Delta d={DELTA[p.name]} /></div>
      </div>
    </div>
  );
}

function LBCompact() {
  return (
    <Screen>
      <Head />
      <Chips />
      <YouBar />
      <div style={{ padding: '4px 18px 0', display: 'flex', flexDirection: 'column' }}>
        {LIST.map(p => <CompactRow key={p.name} p={p} />)}
      </div>
    </Screen>
  );
}

// ============================================================
// B · PODYUM SAHNESİ — celebratory dark hero for the top 3
// ============================================================
function Pedestal({ p, place }) {
  const first = place === 1;
  const medal = MEDAL_HI[place - 1];
  const barH = first ? 84 : place === 2 ? 60 : 48;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {first && <Icon name="crown" size={20} color="#F4D06A" style={{ marginBottom: 4 }} />}
      <Avatar name={p.name} size={first ? 62 : 48} status={p.status} ring={medal} />
      <div style={{ fontWeight: 700, fontSize: first ? 14 : 12.5, color: '#fff', marginTop: 8, whiteSpace: 'nowrap' }}>{p.name.split(' ')[0]}</div>
      <div className="num" style={{ fontWeight: 800, fontSize: first ? 18 : 15, color: medal, marginTop: 1 }}>{p.elo}</div>
      <div style={{ width: '100%', height: barH, marginTop: 10, background: 'rgba(255,255,255,.10)', border: `1.5px solid ${WIRE}`, borderBottom: 'none', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'center', paddingTop: 9 }}>
        <span className="num" style={{ fontWeight: 800, fontSize: 24, color: medal }}>{place}</span>
      </div>
    </div>
  );
}

function PodiumRow({ p }) {
  const lv = levelForElo(p.elo);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface)', border: `1.5px solid ${INK}`, borderRadius: 'var(--r-md)' }}>
      <span className="num" style={{ width: 22, textAlign: 'center', fontWeight: 700, fontSize: 15, color: 'var(--text-3)' }}>{p.rank}</span>
      <Avatar name={p.name} size={40} status={p.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600, marginTop: 1 }}>{lv.name} · {p.wl[0]}G {p.wl[1]}M</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="num" style={{ fontWeight: 700, fontSize: 16 }}>{p.elo}</div>
        <div style={{ marginTop: 1 }}><Delta d={DELTA[p.name]} /></div>
      </div>
    </div>
  );
}

function LBPodium() {
  return (
    <Screen>
      <Head />
      <Chips />
      <div style={{ margin: '10px 14px 0', background: COURT, borderRadius: 'var(--r-lg)', padding: '18px 14px 0', border: `1.5px solid ${INK}`, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', marginBottom: 12 }}>
          <Icon name="trophy" size={14} color="#F4D06A" />
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.14em', color: 'rgba(255,255,255,.62)' }}>SEZON PODYUMU</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <Pedestal p={LIST[1]} place={2} />
          <Pedestal p={LIST[0]} place={1} />
          <Pedestal p={LIST[2]} place={3} />
        </div>
      </div>
      <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--clay-softer)', border: `1.5px solid ${INK}`, borderRadius: 'var(--r-md)' }}>
          <div style={{ textAlign: 'center', minWidth: 22 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '.1em', color: 'var(--clay-text)' }}>SEN</div>
            <div className="num" style={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}>4</div>
          </div>
          <Avatar name={ME.name} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{ME.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--clay-text)', fontWeight: 700, marginTop: 1 }}>Finale 41 gün · ilk 8’desin</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="num" style={{ fontWeight: 800, fontSize: 16 }}>{ME.elo}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}><Icon name="chevU" size={11} color="var(--win)" stroke={3} /><span className="num" style={{ fontSize: 11, fontWeight: 700, color: 'var(--win)' }}>22</span></div>
          </div>
        </div>
        {LIST.slice(3, 6).map(p => <PodiumRow key={p.name} p={p} />)}
      </div>
    </Screen>
  );
}

// ============================================================
// C · FORM TABLOSU — data-dense table with last-5 form column
// ============================================================
function TableRow({ p, you }) {
  const lv = levelForElo(p.elo);
  const medal = p.rank <= 3 ? MEDAL[p.rank - 1] : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', background: you ? 'var(--clay-softer)' : 'transparent', borderBottom: `1px solid ${INK}` }}>
      <span className="num" style={{ width: 20, textAlign: 'center', fontWeight: 800, fontSize: 14.5, color: medal || (you ? 'var(--clay-text)' : 'var(--text-3)'), flexShrink: 0 }}>{p.rank}</span>
      <Avatar name={p.name} size={32} status={p.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{you ? 'Sen' : p.name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600, marginTop: 1 }}>{p.wl[0]}-{p.wl[1]} · {lv.name}</div>
      </div>
      <div style={{ width: 81, flexShrink: 0, display: 'flex', justifyContent: 'flex-start' }}><FormDots form={formFor(p)} /></div>
      <div style={{ width: 52, textAlign: 'right', flexShrink: 0 }}>
        <div className="num" style={{ fontWeight: 700, fontSize: 15 }}>{p.elo}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 1 }}><Delta d={DELTA[p.name]} size={10.5} /></div>
      </div>
    </div>
  );
}

function LBTable() {
  const youP = { ...ME, rank: 4, status: null };
  return (
    <Screen>
      <Head />
      <Chips />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px 7px', fontSize: 10, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '.07em' }}>
        <span style={{ width: 20, textAlign: 'center' }}>#</span>
        <span style={{ flex: 1 }}>OYUNCU</span>
        <span style={{ width: 81 }}>SON 5</span>
        <span style={{ width: 52, textAlign: 'right' }}>ELO</span>
      </div>
      <div>
        <TableRow p={youP} you />
        {LIST.map(p => <TableRow key={p.name} p={p} />)}
      </div>
    </Screen>
  );
}

// ============================================================
// D · EDİTÖRYEL KARTLAR — spacious, leader hero + rich cards
// ============================================================
function LeaderHero({ p }) {
  return (
    <div style={{ margin: '10px 14px 0', background: COURT, borderRadius: 'var(--r-lg)', padding: 16, border: `1.5px solid ${INK}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 13 }}>
        <Icon name="crown" size={15} color="#F4D06A" />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', color: 'rgba(255,255,255,.68)' }}>1. SIRA · SEZON LİDERİ</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <Avatar name={p.name} size={58} ring="#F4D06A" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#fff', whiteSpace: 'nowrap' }}>{p.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.68)', fontWeight: 600, marginTop: 2 }}>{p.dept}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="num" style={{ fontWeight: 800, fontSize: 26, color: '#F4D06A', lineHeight: 1 }}>{p.elo}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.6)', letterSpacing: '.06em', marginTop: 3 }}>ELO</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 13, borderTop: `1.5px solid ${WIRE}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)' }}>Form</span>
          <FormDots form={formFor(p)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: `1.5px solid ${WIRE}`, padding: '5px 11px', borderRadius: 'var(--r-pill)' }}>
          <Icon name="flame" size={14} color="#F4D06A" />
          <span className="num" style={{ fontSize: 12.5, fontWeight: 800, color: '#fff' }}>{p.streak} seri</span>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ p }) {
  const lv = levelForElo(p.elo);
  const medal = p.rank <= 3 ? MEDAL[p.rank - 1] : null;
  return (
    <div style={{ background: 'var(--surface)', border: `1.5px solid ${INK}`, borderRadius: 'var(--r-lg)', padding: 14, display: 'flex', alignItems: 'center', gap: 13 }}>
      <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: medal || 'var(--surface-2)', border: `1.5px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="num" style={{ fontWeight: 800, fontSize: 14, color: medal ? '#fff' : 'var(--text-2)' }}>{p.rank}</span>
      </div>
      <Avatar name={p.name} size={46} status={p.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
          <LevelIcon level={lv} size={13} />
          <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>{lv.name}</span>
        </div>
        <div style={{ marginTop: 8 }}><FormDots form={formFor(p)} size={12} /></div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="num" style={{ fontWeight: 800, fontSize: 19 }}>{p.elo}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}><Delta d={DELTA[p.name]} /></div>
      </div>
    </div>
  );
}

function LBCards() {
  return (
    <Screen>
      <Head />
      <Chips />
      <LeaderHero p={LIST[0]} />
      <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {LIST.slice(1, 4).map(p => <PlayerCard key={p.name} p={p} />)}
      </div>
    </Screen>
  );
}

Object.assign(window, { Screen, LBCompact, LBPodium, LBTable, LBCards });
