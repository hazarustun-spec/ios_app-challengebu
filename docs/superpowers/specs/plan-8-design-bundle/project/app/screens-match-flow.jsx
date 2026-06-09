/* global React, window, useApp, Icon, NavHeader, Avatar, Button, Chip, Segmented, Field, Sheet, FORMATS, COURTS, CATEGORIES, LEADERBOARD, ME, levelForElo, LevelIcon */
// ============================================================
// MATCH FLOW — create → preview → rules → active score → summary → dispute
// (screens 24-32)
// ============================================================
const { useState: fS, useEffect: fE, useRef: fR } = React;
window.NM = window.NM || { kind: 'ranking', path: 'direct', cat: 'erkek_tek', format: 'klasik', date: 'Bugün', time: '18:30', court: 'Kort 1', opponent: null };

// ---------- 24: type ----------
function NewMatchType() {
  const { nav } = useApp();
  const cards = [
    { kind: 'ranking', icon: 'trophy', title: 'Sıralama Maçı', tag: 'ELO ETKİLER',
      desc: 'ELO’nu etkiler, sıralamada yükselirsin. Format kuralları zorunlu.',
      bg: 'var(--court)', fg: '#fff', fgSoft: 'rgba(255,255,255,.82)', tile: 'rgba(255,255,255,.16)', wm: 'rgba(255,255,255,.13)', arrowBg: '#fff', arrowFg: 'var(--court)' },
    { kind: 'friendly', icon: 'handshake', title: 'Dostluk Maçı', tag: 'EĞLENCE',
      desc: 'ELO’ya etki etmez — eğlence ve antrenman için. İstatistiklere sayılmaz.',
      bg: 'var(--pink-deep)', fg: '#fff', fgSoft: 'rgba(255,255,255,.82)', tile: 'rgba(255,255,255,.16)', wm: 'rgba(255,255,255,.13)', arrowBg: '#fff', arrowFg: 'var(--pink-deep)' },
  ];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader large title="Yeni Maç" subtitle="Ne tür bir maç oynamak istersin?" actionIcon="x" onAction={() => nav.reset('leaderboard')} />
      <div className="scroll-y" style={{ flex: 1, padding: '14px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {cards.map(c => (
          <button key={c.kind} onClick={() => { window.NM.kind = c.kind; nav.go('new_match_path'); }} style={{
            position: 'relative', overflow: 'hidden', textAlign: 'left', cursor: 'pointer', flex: 1,
            background: c.bg, border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-xl)',
            padding: 22, minHeight: 214, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: 'var(--font-sans)',
          }}>
            <Icon name={c.icon} size={170} color={c.wm} stroke={1.6} style={{ position: 'absolute', right: -32, bottom: -34, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 56, height: 56, borderRadius: 'var(--r-lg)', background: c.tile, border: `1.5px solid ${c.fg}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={c.icon} size={28} color={c.fg} />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: c.fg, border: `1.5px solid ${c.fg}`, padding: '6px 12px', borderRadius: 'var(--r-pill)' }}>{c.tag}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <div className="tc-display" style={{ fontWeight: 800, fontSize: 27, letterSpacing: '-.02em', color: c.fg }}>{c.title}</div>
              <p style={{ fontSize: 13.5, color: c.fgSoft, lineHeight: 1.45, margin: '6px 0 0', maxWidth: '78%' }}>{c.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
                <span style={{ width: 40, height: 40, borderRadius: '50%', background: c.arrowBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="arrowRight" size={19} color={c.arrowFg} stroke={2.5} /></span>
                <span style={{ fontWeight: 800, fontSize: 14.5, color: c.fg }}>Seç</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- 25: path ----------
function NewMatchPath() {
  const { nav } = useApp();
  const opt = (path, icon, title, desc) => (
    <button onClick={() => { window.NM.path = path; nav.go('new_match_detail'); }} style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: 20, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 50, height: 50, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={24} color="var(--text)" /></div>
      <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 17 }}>{title}</div><p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.45, margin: '4px 0 0' }}>{desc}</p></div>
      <Icon name="chevR" size={20} color="var(--text-3)" />
    </button>
  );
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Nasıl rakip bulalım?" />
      <div className="scroll-y" style={{ flex: 1, padding: '12px 18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {opt('direct', 'bolt', 'Direkt Meydan Okuma', 'Belirli bir oyuncuya doğrudan teklif gönder.')}
        {opt('open', 'megaphone', 'Açık İlan', 'İlan oluştur, uygun olan başvursun. Sen seç.')}
      </div>
    </div>
  );
}

// ---------- 26: detail ----------
function Selector({ label, value, icon, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', height: 54, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
      <Icon name={icon} size={20} color="var(--text-3)" />
      <span style={{ flex: 1, textAlign: 'left' }}><span style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', fontWeight: 700 }}>{label}</span><span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{value}</span></span>
      <Icon name="chevD" size={18} color="var(--text-3)" />
    </button>
  );
}

function NewMatchDetail({ params }) {
  const { nav } = useApp();
  const [nm, setNm] = fS(() => ({ ...window.NM, opponent: params.opponent || window.NM.opponent }));
  const upd = (k, v) => { setNm(s => { const n = { ...s, [k]: v }; window.NM = n; return n; }); };
  const cat = CATEGORIES.find(c => c.key === nm.cat);
  const fmt = FORMATS.find(f => f.key === nm.format);
  const isDoubles = cat.group === 'cift';

  const pickFormat = () => nav.sheet(
    <Sheet onClose={() => nav.closeSheet()} title="Format seç">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FORMATS.map(f => { const on = f.key === nm.format; return (
          <button key={f.key} onClick={() => { upd('format', f.key); nav.closeSheet(); }} style={{ textAlign: 'left', cursor: 'pointer', padding: 14, borderRadius: 'var(--r-md)', border: `1.5px solid ${on ? f.color : 'var(--border-strong)'}`, background: on ? 'color-mix(in srgb, ' + f.color + ' 8%, var(--surface))' : 'var(--surface)', fontFamily: 'var(--font-sans)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'color-mix(in srgb, ' + f.color + ' 14%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={f.mark} size={19} color={f.color} /></div>
              <div style={{ flex: 1 }}><span style={{ fontWeight: 800, fontSize: 15.5 }}>{f.name}</span> <span style={{ fontSize: 12, fontWeight: 700, color: f.color }}>· {f.tag}</span></div>
              {on && <Icon name="check" size={18} color={f.color} stroke={3} />}
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '8px 0 0', lineHeight: 1.4 }}>{f.desc}</p>
          </button>
        ); })}
      </div>
    </Sheet>
  );
  const pickCat = () => nav.sheet(
    <Sheet onClose={() => nav.closeSheet()} title="Kategori seç">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {CATEGORIES.map(c => { const on = c.key === nm.cat; return (
          <button key={c.key} onClick={() => { upd('cat', c.key); nav.closeSheet(); }} style={{ padding: '14px 10px', borderRadius: 'var(--r-md)', border: `1.5px solid ${on ? 'var(--clay)' : 'var(--border-strong)'}`, background: on ? 'var(--clay-softer)' : 'var(--surface)', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{c.label}</button>
        ); })}
      </div>
    </Sheet>
  );
  const pickCourt = () => nav.sheet(
    <Sheet onClose={() => nav.closeSheet()} title="Kort seç">
      {COURTS.map(c => (
        <button key={c} onClick={() => { upd('court', c); nav.closeSheet(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '15px 8px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          <Icon name="pin" size={20} color={c === 'Bebek Kort' ? 'var(--grass)' : 'var(--clay)'} />
          <span style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 15 }}>{c}</span>
          {nm.court === c && <Icon name="check" size={18} color="var(--clay)" stroke={3} />}
        </button>
      ))}
    </Sheet>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Maç detayları" />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Selector label="Kategori" value={cat.label} icon="ranking" onClick={pickCat} />
        <Selector label="Format" value={`${fmt.name} · ${fmt.tag}`} icon={fmt.mark} onClick={pickFormat} />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}><Selector label="Tarih" value={nm.date} icon="calendar" onClick={() => nav.sheet(<DateSheet onPick={(d) => { upd('date', d); nav.closeSheet(); }} />)} /></div>
          <div style={{ flex: 1 }}><Selector label="Saat" value={nm.time} icon="clock" onClick={() => nav.sheet(<TimeSheet onPick={(t) => { upd('time', t); nav.closeSheet(); }} />)} /></div>
        </div>
        <Selector label="Kort" value={nm.court} icon="pin" onClick={pickCourt} />
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 13, display: 'flex', gap: 10, marginTop: 4 }}>
          <Icon name="info" size={17} color="var(--info)" />
          <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>{isDoubles ? 'Çift maçı — sıradaki adımda partner ve rakip çifti seçeceksin.' : 'Tek maçı — sıradaki adımda rakibini seçeceksin.'}</p>
        </div>
      </div>
      <div style={{ padding: '8px 18px 26px' }}>
        <Button full size="lg" iconRight="chevR" onClick={() => nav.go('new_match_opponent', { doubles: isDoubles })}>{window.NM.path === 'open' ? 'İlan detayına geç' : 'Rakip seç'}</Button>
      </div>
    </div>
  );
}

function DateSheet({ onPick }) {
  const { nav } = useApp();
  const days = ['Bugün', 'Yarın', '8 Haz Paz', '9 Haz Pzt', '10 Haz Sal', '11 Haz Çar'];
  return <Sheet onClose={() => nav.closeSheet()} title="Tarih seç">{days.map(d => <button key={d} onClick={() => onPick(d)} style={{ width: '100%', padding: '15px 8px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'var(--font-sans)', color: 'var(--text)' }}>{d}</button>)}</Sheet>;
}
function TimeSheet({ onPick }) {
  const { nav } = useApp();
  const times = ['10:00', '12:00', '14:00', '16:00', '18:30', '20:00', '21:30'];
  return <Sheet onClose={() => nav.closeSheet()} title="Saat seç"><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>{times.map(t => <button key={t} onClick={() => onPick(t)} className="num" style={{ padding: '14px 4px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', fontWeight: 700, fontSize: 15, cursor: 'pointer', color: 'var(--text)' }}>{t}</button>)}</div></Sheet>;
}

// ---------- 27: opponent / partner ----------
function NewMatchOpponent({ params }) {
  const { nav } = useApp();
  const [q, setQ] = fS('');
  const [sel, setSel] = fS(window.NM.opponent);
  const pool = LEADERBOARD.erkek_tek.filter(p => p.name !== ME.name).filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  const isOpen = window.NM.path === 'open';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title={isOpen ? 'İlan notu' : params.doubles ? 'Partner & rakip' : 'Rakip seç'} />
      <div style={{ padding: '4px 18px 10px' }}><Field icon="search" placeholder="Oyuncu ara…" value={q} onChange={setQ} /></div>
      <div className="scroll-y" style={{ flex: 1, padding: '0 16px 20px' }}>
        {params.doubles && <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', padding: '6px 4px 8px' }}>Partnerin</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pool.map(p => { const lv = levelForElo(p.elo); const on = sel === p.name; return (
            <button key={p.name} onClick={() => setSel(p.name)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 'var(--r-md)', border: `1.5px solid ${on ? 'var(--clay)' : 'var(--border)'}`, background: on ? 'var(--clay-softer)' : 'var(--surface)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              <Avatar name={p.name} size={42} status={p.status} />
              <div style={{ flex: 1, textAlign: 'left' }}><div style={{ fontWeight: 700, fontSize: 14.5 }}>{p.name}</div><div className="num" style={{ fontSize: 12.5, fontWeight: 700, color: lv.color, marginTop: 1 }}>{p.elo} · {lv.name}</div></div>
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: on ? 'none' : '2px solid var(--border-strong)', background: on ? 'var(--clay)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && <Icon name="check" size={13} color="#fff" stroke={3} />}</div>
            </button>
          ); })}
        </div>
      </div>
      <div style={{ padding: '8px 18px 26px' }}>
        <Button full size="lg" disabled={!sel} iconRight="chevR" onClick={() => { window.NM.opponent = sel; nav.go('match_preview'); }}>Önizlemeye geç</Button>
      </div>
    </div>
  );
}

// ---------- 28: preview ----------
function MatchPreview() {
  const { nav } = useApp();
  const nm = window.NM;
  const cat = CATEGORIES.find(c => c.key === nm.cat);
  const fmt = FORMATS.find(f => f.key === nm.format);
  const oppName = nm.opponent || 'Berk Aydın';
  const oppElo = (LEADERBOARD.erkek_tek.find(p => p.name === oppName) || {}).elo || 1700;
  const rows = [['Tip', nm.kind === 'ranking' ? '🏆 Sıralama Maçı' : '🤝 Dostluk Maçı'], ['Kategori', cat.label], ['Format', `${fmt.name} · ${fmt.tag}`], ['Tarih', `${nm.date} · ${nm.time}`], ['Kort', nm.court]];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Teklif önizleme" />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '14px 0 22px' }}>
          <div style={{ textAlign: 'center' }}><Avatar name={ME.name} slot="me-photo" round size={64} /><div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 8 }}>Sen</div><div className="num" style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700 }}>{ME.elo}</div></div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-3)', fontFamily: 'var(--font-num)' }}>VS</div>
          <div style={{ textAlign: 'center' }}><Avatar name={oppName} round size={64} /><div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 8 }}>{oppName.split(' ')[0]}</div><div className="num" style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700 }}>{oppElo}</div></div>
        </div>
        {nm.kind === 'ranking' && (() => {
          const exp = 1 / (1 + Math.pow(10, (oppElo - ME.elo) / 400));
          const win = Math.round(32 * (1 - exp)); const loss = -Math.round(32 * exp);
          return (
            <div style={{ marginBottom: 14, background: 'var(--surface)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              <div style={{ display: 'flex' }}>
                <div style={{ flex: 1, padding: '13px 16px', textAlign: 'center', borderRight: '1.5px solid var(--border-strong)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 3 }}>Kazanırsan</div>
                  <div className="num" style={{ fontWeight: 800, fontSize: 26, color: 'var(--win)' }}>+{win}</div>
                </div>
                <div style={{ flex: 1, padding: '13px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 3 }}>Kaybedersen</div>
                  <div className="num" style={{ fontWeight: 800, fontSize: 26, color: 'var(--loss)' }}>{loss}</div>
                </div>
              </div>
              <div style={{ padding: '9px 14px', borderTop: '1.5px solid var(--border-strong)', display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface-2)' }}>
                <Icon name="info" size={14} color="var(--text-3)" />
                <span style={{ fontSize: 11.5, color: 'var(--text-2)', fontWeight: 600 }}>Tahmini · çarpan {fmt.tag} skoruna göre · K-faktör 32</span>
              </div>
            </div>
          );
        })()}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {rows.map(([l, v], i) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 600 }}>{l}</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
        {nm.kind === 'ranking' && (
          <button onClick={() => nav.go('format_rules', { format: nm.format })} style={{ width: '100%', marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'var(--clay-softer)', border: '1px solid var(--clay-soft)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            <Icon name="info" size={18} color="var(--clay)" />
            <span style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 13.5, color: 'var(--clay-text)' }}>Format kurallarını oku (zorunlu)</span>
            <Icon name="chevR" size={18} color="var(--clay)" />
          </button>
        )}
      </div>
      <div style={{ padding: '8px 18px 26px' }}>
        <Button full size="lg" icon="share" onClick={() => { nav.toast('Teklif gönderildi · ' + oppName); nav.reset('matches_upcoming'); }}>Teklifi gönder</Button>
      </div>
    </div>
  );
}

// ---------- 29: format rules (mandatory) ----------
function FormatRules({ params }) {
  const { nav } = useApp();
  const f = FORMATS.find(x => x.key === (params.format || 'klasik'));
  const [read, setRead] = fS(false);
  const rules = {
    klasik: ['4 el (game) oynanır, ilk 4 ele ulaşan kazanır.', 'Her el 15 / 30 / 40 / avantaj puanlamasıyla oynanır.', '40-40’ta avantaj sistemi geçerlidir (deuce).', '3-3 olursa maç berabere sayılır ve geçersiz kılınır (voided) — ELO değişmez.'],
    tiebreak: ['Tek bir tiebreak oynanır, 10 sayıya ulaşan kazanır.', '9-9 olursa 2 sayı fark gerekir.', 'Her 2 sayıda bir servis değişir.', 'Hızlı ve keskin — tek oturuşta biter.'],
    proset: ['8 oyuna (game) ilk ulaşan kazanır.', 'Standart oyun puanlaması (15/30/40/Ad) geçerlidir.', '8-8 olursa 7 sayılık tiebreak oynanır.', 'Antrenman ve ciddi maç arası dengeli format.'],
    set3: ['En iyi 2/3 set — 2 set alan kazanır.', 'Her set 6 oyuna, 5-5’te 7’ye, 6-6’da tiebreak.', 'Final maçlarında kullanılır (ATP standardı).', 'En uzun ve en prestijli format.'],
  }[f.key];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} close title="Format Kuralları" />
      <div className="scroll-y" style={{ flex: 1, padding: '4px 20px 20px' }}>
        <div style={{ background: 'color-mix(in srgb, ' + f.color + ' 10%, var(--surface))', border: '1px solid color-mix(in srgb, ' + f.color + ' 25%, transparent)', borderRadius: 'var(--r-lg)', padding: 18, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb, ' + f.color + ' 18%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={f.mark} size={24} color={f.color} /></div>
            <div><div style={{ fontWeight: 800, fontSize: 19 }}>{f.name}</div><div style={{ fontSize: 13, fontWeight: 700, color: f.color }}>{f.tag}</div></div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, margin: '14px 0 0' }}>{f.desc}</p>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Kurallar</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {rules.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div className="num" style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface-2)', color: f.color, fontWeight: 800, fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>{r}</p>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>ELO Çarpanı (skor farkına göre)</div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
          <p className="num" style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7, margin: 0, fontWeight: 600 }}>{f.mult}</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '10px 0 0', lineHeight: 1.5 }}>Net galibiyetler daha çok puan kazandırır. K-faktör: ilk 10 maç K=40, sonrası K=20.</p>
        </div>
      </div>
      <div style={{ padding: '8px 20px 26px', borderTop: '1px solid var(--border)' }}>
        <label onClick={() => setRead(!read)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
          <div style={{ width: 24, height: 24, borderRadius: 'var(--r-xs)', border: read ? 'none' : '2px solid var(--border-strong)', background: read ? 'var(--grass)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{read && <Icon name="check" size={15} color="#fff" stroke={3} />}</div>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>Kuralları okudum ve anladım</span>
        </label>
        <Button full size="lg" disabled={!read} onClick={() => nav.back()}>Onayla ve devam et</Button>
      </div>
    </div>
  );
}

// ---------- 30: ACTIVE MATCH SCORE ENTRY (critical) ----------
function ActiveMatch({ params }) {
  const { nav } = useApp();
  const opp = params.opp || 'Berk Aydın';
  const fmt = FORMATS.find(f => f.key === (params.format || 'klasik'));
  const PTS = ['0', '15', '30', '40', 'Ad'];
  const [gA, setGA] = fS(0), [gB, setGB] = fS(0);
  const [pA, setPA] = fS(0), [pB, setPB] = fS(0);
  const [mismatch, setMismatch] = fS(false);
  const [hist, setHist] = fS([]);
  const total = gA + gB;
  const isVoid = gA === 3 && gB === 3;
  const someoneWon = gA === 4 || gB === 4;

  const award = (who) => {
    if (someoneWon || isVoid) return;
    setHist(h => [...h, { gA, gB, pA, pB }]);
    let a = pA, b = pB;
    if (who === 'A') a++; else b++;
    const win = (x, y) => (x >= 4 && x - y >= 1 && !(x === 4 && y === 4));
    if (win(a, b)) { setGA(g => who === 'A' ? g + 1 : g); setGB(g => who === 'B' ? g + 1 : g); setPA(0); setPB(0); }
    else if (a === 4 && b === 4) { setPA(3); setPB(3); }
    else { setPA(a); setPB(b); }
  };
  const undo = () => { setHist(h => { if (!h.length) return h; const s = h[h.length - 1]; setGA(s.gA); setGB(s.gB); setPA(s.pA); setPB(s.pB); return h.slice(0, -1); }); };
  const ptLabel = (p, other) => (p === 4 && other < 3) ? 'Ad' : PTS[Math.min(p, 4)];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <NavHeader onBack={() => nav.back()} close title="Canlı Maç" subtitle={`${fmt.name} · ${params.court || 'Kort 1'}`} />
      <div style={{ margin: '0 16px 10px', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: mismatch ? 'var(--warn-soft)' : 'var(--grass-soft)', borderRadius: 'var(--r-pill)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: mismatch ? 'var(--warn)' : 'var(--grass)', animation: 'pulse 1.4s infinite' }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: mismatch ? 'var(--warn)' : 'var(--grass-text)' }}>{mismatch ? 'Skorlar uyuşmuyor — uzlaşma gerekli' : 'Canlı senkron · ' + opp.split(' ')[0] + ' bağlı'}</span>
      </div>

      <div style={{ margin: '0 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        {[{ n: ME.name, g: gA, p: ptLabel(pA, pB), me: true }, { n: opp, g: gB, p: ptLabel(pB, pA), me: false }].map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderTop: i ? '1px solid var(--border)' : 'none', background: r.me ? 'var(--clay-softer)' : 'transparent' }}>
            <Avatar name={r.n} size={42} />
            <div style={{ flex: 1, fontWeight: 700, fontSize: 15.5 }}>{r.me ? 'Sen' : r.n}</div>
            <div className="num" style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-3)', width: 38, textAlign: 'center' }}>{r.p}</div>
            <div className="num" style={{ fontWeight: 800, fontSize: 36, width: 40, textAlign: 'center', color: r.g === 4 ? 'var(--win)' : 'var(--text)' }}>{r.g}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', fontWeight: 700, margin: '10px 0' }} className="num">EL {Math.min(total + 1, 6)} / 7 · {isVoid ? '3-3 BERABERE' : someoneWon ? 'MAÇ BİTTİ' : 'GÜNCEL'}</div>

      {!someoneWon && !isVoid && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {[{ who: 'A', label: 'Sana sayı', c: 'var(--court)' }, { who: 'B', label: opp.split(' ')[0] + ' sayı', c: 'var(--text)' }].map(b => (
              <button key={b.who} onClick={() => award(b.who)} style={{ flex: 1, height: 84, borderRadius: 'var(--r-lg)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'var(--font-sans)' }}>
                <Icon name="plus" size={27} color={b.c} stroke={2.6} />
                <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>{b.label}</span>
              </button>
            ))}
          </div>
          <button onClick={undo} disabled={!hist.length} style={{ marginTop: 10, width: '100%', height: 44, borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'transparent', cursor: hist.length ? 'pointer' : 'default', opacity: hist.length ? 1 : .4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>
            <Icon name="refresh" size={16} color="var(--text)" /> Son sayıyı geri al
          </button>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Icon name="refresh" size={12} color="var(--text-3)" /> Çevrimdışıyken kaydedilir, bağlanınca eşitlenir
          </div>
        </div>
      )}

      {mismatch && (
        <div style={{ margin: '14px 16px 0', padding: 14, background: 'var(--surface)', border: '1.5px solid var(--warn)', borderRadius: 'var(--r-md)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}><Icon name="warn" size={18} color="var(--warn)" /><span style={{ fontWeight: 800, fontSize: 14 }}>Son el uyuşmuyor</span></div>
          <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '0 0 12px', lineHeight: 1.5 }}>Sen <b className="num">4-2</b> girdin, {opp.split(' ')[0]} <b className="num">4-3</b> girdi. Hangisi doğru?</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setMismatch(false)} style={{ flex: 1 }}>4-3 kabul et</Button>
            <Button size="sm" onClick={() => setMismatch(false)} style={{ flex: 1 }}>4-2 doğru</Button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 'auto', padding: '14px 16px 26px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {!mismatch && !someoneWon && !isVoid && <button onClick={() => setMismatch(true)} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>⚠︎ Uyumsuzluk senaryosunu gör</button>}
        <Button full size="lg" variant={someoneWon || isVoid ? 'primary' : 'secondary'} disabled={!someoneWon && !isVoid} icon="flag"
          onClick={() => nav.go('match_summary', { opp, win: gA > gB, score: `${gA}-${gB}`, format: params.format, voided: isVoid })}>
          {isVoid ? 'Berabere — Maçı kapat' : 'Maçı Bitir'}
        </Button>
      </div>
    </div>
  );
}

// ---------- 31: summary ----------
function MatchSummary({ params }) {
  const { nav } = useApp();
  const opp = params.opp || 'Berk Aydın';
  const win = params.win, voided = params.voided;
  const delta = voided ? 0 : win ? 22 : -16;
  const fmt = FORMATS.find(f => f.key === (params.format || 'klasik'));
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} close={!params.readonly} title="Maç Sonucu" />
      <div className="scroll-y" style={{ flex: 1, padding: '4px 20px 20px' }}>
        <div style={{ textAlign: 'center', padding: '14px 0 20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 'var(--r-pill)', background: voided ? 'var(--warn-soft)' : win ? 'var(--grass-soft)' : 'color-mix(in srgb, var(--loss) 12%, transparent)', marginBottom: 16 }}>
            <Icon name={voided ? 'info' : win ? 'trophy' : 'x'} size={16} color={voided ? 'var(--warn)' : win ? 'var(--win)' : 'var(--loss)'} />
            <span style={{ fontWeight: 800, fontSize: 14, color: voided ? 'var(--warn)' : win ? 'var(--win)' : 'var(--loss)' }}>{voided ? 'Berabere (voided)' : win ? 'Kazandın!' : 'Kaybettin'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <Avatar name={ME.name} slot="me-photo" round size={58} ring={win && !voided ? 'var(--win)' : undefined} />
            <div className="num" style={{ fontWeight: 800, fontSize: 40, letterSpacing: '-.03em' }}>{params.score || '4-2'}</div>
            <Avatar name={opp} round size={58} ring={!win && !voided ? 'var(--win)' : undefined} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 12, fontWeight: 600 }}>{fmt.name} · {params.court || 'Kort 1'} · Bugün</div>
        </div>

        {!voided && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 18, marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-3)', marginBottom: 10 }}>Tahmini ELO değişimi</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className="num" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-3)' }}>{ME.elo}</span>
              <Icon name="chevR" size={20} color="var(--text-3)" />
              <CountUp className="num" from={ME.elo} to={ME.elo + delta} style={{ fontSize: 30, fontWeight: 800, color: win ? 'var(--win)' : 'var(--loss)' }} />
              <span className="num" style={{ marginLeft: 'auto', fontSize: 17, fontWeight: 800, color: win ? 'var(--win)' : 'var(--loss)', background: win ? 'var(--grass-soft)' : 'color-mix(in srgb, var(--loss) 12%, transparent)', padding: '4px 11px', borderRadius: 'var(--r-pill)' }}>{delta > 0 ? '+' : ''}{delta}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '12px 0 0', lineHeight: 1.5 }}>Çarpan: {params.score || '4-2'} → {win ? '1.1×' : '1.0×'}. Onaylandığında kesinleşir.</p>
          </div>
        )}
        {voided && <div style={{ background: 'var(--warn-soft)', borderRadius: 'var(--r-md)', padding: 14, marginBottom: 14, display: 'flex', gap: 10 }}><Icon name="info" size={18} color="var(--warn)" /><p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>3-3 berabere — bu maç ELO’yu etkilemez ama istatistiklerine işlenir.</p></div>}
      </div>
      {!params.readonly && (
        <div style={{ padding: '8px 20px 26px', display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="lg" icon="flag" onClick={() => nav.go('dispute_form', { opp })} style={{ flex: 1 }}>İtiraz et</Button>
          <Button size="lg" icon="check" onClick={() => { nav.toast('Sonuç onaylandı'); nav.reset('leaderboard'); }} style={{ flex: 1.5 }}>Onayla</Button>
        </div>
      )}
    </div>
  );
}

// ---------- 32: dispute ----------
function DisputeForm({ params }) {
  const { nav } = useApp();
  const [reason, setReason] = fS('');
  const [note, setNote] = fS('');
  const reasons = [['score', 'Skor yanlış girilmiş'], ['notplayed', 'Bu maç oynanmadı'], ['format', 'Yanlış format/kategori'], ['other', 'Diğer']];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="İtiraz Et" />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 20px 20px' }}>
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 14, marginBottom: 18, display: 'flex', gap: 10 }}>
          <Icon name="info" size={18} color="var(--info)" />
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>İtirazın bir admin tarafından incelenecek. Karar verilene kadar ELO değişimi askıya alınır.</p>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>İtiraz sebebi</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {reasons.map(([k, l]) => { const on = reason === k; return (
            <button key={k} onClick={() => setReason(k)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', borderRadius: 'var(--r-md)', border: `1.5px solid ${on ? 'var(--clay)' : 'var(--border-strong)'}`, background: on ? 'var(--clay-softer)' : 'var(--surface)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: on ? 'none' : '2px solid var(--border-strong)', background: on ? 'var(--clay)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && <Icon name="check" size={12} color="#fff" stroke={3} />}</div>
              <span style={{ fontWeight: 700, fontSize: 14.5 }}>{l}</span>
            </button>
          ); })}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>Açıklama</div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ne olduğunu kısaca anlat…" rows={4} style={{ width: '100%', padding: 14, borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text)', resize: 'none', outline: 'none' }} />
      </div>
      <div style={{ padding: '8px 20px 26px' }}>
        <Button full size="lg" disabled={!reason} variant="primary" icon="flag" onClick={() => { nav.toast('İtirazın gönderildi'); nav.reset('matches_upcoming'); }}>İtirazı gönder</Button>
      </div>
    </div>
  );
}

registerScreens([
  { id: 'new_match_type', group: 'Maçlar', title: 'Yeni maç · tip', comp: NewMatchType, tab: 'new' },
  { id: 'new_match_path', group: 'Maçlar', title: 'Yeni maç · yol', comp: NewMatchPath },
  { id: 'new_match_detail', group: 'Maçlar', title: 'Yeni maç · detay', comp: NewMatchDetail },
  { id: 'new_match_opponent', group: 'Maçlar', title: 'Yeni maç · rakip', comp: NewMatchOpponent },
  { id: 'match_preview', group: 'Maçlar', title: 'Teklif önizleme', comp: MatchPreview },
  { id: 'format_rules', group: 'Maçlar', title: 'Format kuralları', comp: FormatRules },
  { id: 'active_match', group: 'Maçlar', title: 'Aktif maç · skor', comp: ActiveMatch },
  { id: 'match_summary', group: 'Maçlar', title: 'Maç sonu özeti', comp: MatchSummary },
  { id: 'dispute_form', group: 'Maçlar', title: 'İtiraz formu', comp: DisputeForm },
]);
