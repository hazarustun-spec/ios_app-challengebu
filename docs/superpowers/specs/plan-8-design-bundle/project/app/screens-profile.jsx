/* global React, window, useApp, Icon, NavHeader, Avatar, Button, Chip, Segmented, Toggle, ListRow, SectionLabel, Sheet, Modal, ME, BADGES, CATEGORIES, LEVELS, levelForElo, LevelIcon, NameLine, Cloud, Squiggle, Star */
// ============================================================
// PROFILE + GAMIFICATION  (screens 35-42)
// ============================================================
const { useState: pfS } = React;

const MY_RANKS = [
  { cat: 'erkek_tek', rank: 4, elo: 1612, delta: +22 },
  { cat: 'open_tek', rank: 9, elo: 1612, delta: +22 },
  { cat: 'erkek_cift', rank: 2, elo: 1540, delta: -8 },
];

// ---------- 35: profile ----------
function Profile() {
  const { nav } = useApp();
  const [tab, setTab] = pfS('rank');
  const lv = levelForElo(ME.elo);
  const lp = levelProgress(ME.elo);
  const me = { name: ME.name, pronoun: ME.pronoun, badges: ME.badges, seasonChamp: false, annualChamp: false };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader large title="Profil" actionIcon="settings" onAction={() => nav.go('settings')} />
      <div className="scroll-y" style={{ flex: 1, padding: '0 0 24px' }}>
        {/* header */}
        <div style={{ padding: '4px 20px 16px', display: 'flex', gap: 16, alignItems: 'center' }}>
          <LevelRing name={ME.name} slot="me-photo" size={82} elo={ME.elo} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 21, letterSpacing: '-.02em' }}>{ME.name}</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 7px', borderRadius: 'var(--r-pill)', fontWeight: 600 }}>{ME.pronoun}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}><LevelIcon level={lv} size={16} /><span style={{ fontWeight: 700, fontSize: 13.5, color: lv.color }}>{lv.name}</span></div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 3 }}>{ME.dept} · {ME.year}. sınıf · {ME.hand} el</div>
            {lp.next && (
              <div style={{ marginTop: 7, maxWidth: 210 }}>
                <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 'var(--r-pill)', overflow: 'hidden' }}><div style={{ width: `${Math.round(lp.pct * 100)}%`, height: '100%', background: lv.color, borderRadius: 'var(--r-pill)' }} /></div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700, marginTop: 4 }}><span className="num">{lp.next.name}</span>’e {lp.toNext} ELO</div>
              </div>
            )}
          </div>
        </div>
        {/* showcase badges */}
        <div style={{ padding: '0 20px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Vitrin Rozetleri</span>
            <button onClick={() => nav.go('badges')} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--clay)', background: 'none', border: 'none', cursor: 'pointer' }}>Düzenle</button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {ME.badges.slice(0, 3).map(k => { const b = BADGES.find(x => x.key === k); return (
              <div key={k} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px 6px', textAlign: 'center' }}>
                <Icon name={b.icon} size={22} color={b.color} />
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.2 }}>{b.name}</div>
              </div>
            ); })}
          </div>
        </div>
        {/* tabs */}
        <div className="scroll-x" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 18px 12px', borderBottom: '1px solid var(--border)' }}>
          {[['rank', 'Sıralamalar'], ['stats', 'İstatistikler'], ['badges', 'Rozetler'], ['elo', 'ELO Geçmişi'], ['matches', 'Maçlar']].map(([k, l]) => (
            <button key={k} onClick={() => { if (k === 'stats') nav.go('stats'); else if (k === 'badges') nav.go('badges'); else if (k === 'elo') nav.go('elo_history'); else if (k === 'matches') nav.go('match_history'); else setTab(k); }}
              style={{ flexShrink: 0, padding: '7px 13px', borderRadius: 'var(--r-pill)', cursor: 'pointer', fontFamily: 'var(--font-sans)', border: 'none', background: tab === k ? 'var(--text)' : 'transparent', color: tab === k ? 'var(--bg)' : 'var(--text-2)', fontWeight: 700, fontSize: 13 }}>{l}</button>
          ))}
        </div>
        {/* rankings — STYLE A: big full-color cards */}
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MY_RANKS.map((r, i) => { const c = CATEGORIES.find(x => x.key === r.cat); const rl = levelForElo(r.elo);
            const themes = [
              { bg: 'var(--lime)', fg: 'var(--on-lime)', sub: 'rgba(22,22,24,.62)', pill: 'rgba(255,255,255,.5)', pillFg: 'var(--on-lime)' },
              { bg: 'var(--court)', fg: '#fff', sub: 'rgba(255,255,255,.75)', pill: 'rgba(255,255,255,.2)', pillFg: '#fff' },
              { bg: 'var(--text)', fg: 'var(--bg)', sub: 'color-mix(in srgb, var(--bg) 60%, transparent)', pill: 'rgba(255,255,255,.14)', pillFg: 'var(--bg)' },
            ][i % 3];
            return (
            <div key={r.cat} onClick={() => nav.go('leaderboard', { cat: r.cat })} style={{ position: 'relative', overflow: 'hidden', padding: '20px 20px', background: themes.bg, borderRadius: 'var(--r-lg)', cursor: 'pointer', border: '1.5px solid var(--border-strong)' }}>
              <Cloud w={120} color={themes.pill} fill={themes.pill} style={{ position: 'absolute', top: -16, right: -18, opacity: .8 }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: themes.pillFg, background: themes.pill, padding: '5px 11px', borderRadius: 'var(--r-pill)' }}>{c.label.toUpperCase()}</span>
                <span className="num" style={{ fontSize: 12.5, fontWeight: 800, color: r.delta >= 0 ? themes.fg : themes.fg, opacity: .9 }}>{r.delta > 0 ? '▲ ' : r.delta < 0 ? '▼ ' : '– '}{Math.abs(r.delta)}</span>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="num tc-display" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: themes.fg }}>#{r.rank}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <LevelIcon level={rl} size={15} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: themes.sub }}>{rl.name}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: themes.sub, marginBottom: 2 }}>ELO</div>
                  <div className="num tc-display" style={{ fontWeight: 800, fontSize: 30, lineHeight: 1, color: themes.fg }}>{r.elo}</div>
                </div>
              </div>
            </div>
          ); })}
        </div>
      </div>
    </div>
  );
}

// ---------- 36: ELO history ----------
function EloChart({ data, season }) {
  const W = 320, H = 150, pad = 8;
  const min = Math.min(...data) - 30, max = Math.max(...data) + 30;
  const x = i => pad + i * (W - pad * 2) / (data.length - 1);
  const y = v => H - pad - (v - min) / (max - min) * (H - pad * 2);
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const [sel, setSel] = pfS(data.length - 1);
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {season.map((s, i) => <line key={i} x1={x(s)} y1={pad} x2={x(s)} y2={H - pad} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 3" />)}
        <polyline points={pts} fill="none" stroke="var(--clay)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points={`${pts} ${x(data.length - 1)},${H - pad} ${x(0)},${H - pad}`} fill="var(--clay)" opacity="0.07" />
        {data.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={sel === i ? 5 : 3} fill={sel === i ? 'var(--clay)' : 'var(--surface)'} stroke="var(--clay)" strokeWidth="2" onClick={() => setSel(i)} style={{ cursor: 'pointer' }} />)}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Maç {sel + 1}</span>
        <span className="num" style={{ fontSize: 13, fontWeight: 800, color: 'var(--clay)' }}>{data[sel]} ELO</span>
      </div>
    </div>
  );
}

function EloHistory() {
  const { nav } = useApp();
  const [cat, setCat] = pfS('erkek_tek');
  const data = [1200, 1218, 1205, 1240, 1262, 1255, 1288, 1310, 1295, 1340, 1380, 1365, 1410, 1452, 1480, 1430, 1466, 1510, 1548, 1530, 1566, 1590, 1612];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="ELO Geçmişi" />
      <div style={{ padding: '4px 18px 8px' }}>
        <Segmented size="sm" value={cat} onChange={setCat} options={[{ value: 'erkek_tek', label: 'Erkek Tek' }, { value: 'open_tek', label: 'Open Tek' }, { value: 'erkek_cift', label: 'Erkek Çift' }]} />
      </div>
      <div className="scroll-y" style={{ flex: 1, padding: '12px 18px 24px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 18, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            <div><div style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 700 }}>Güncel</div><div className="num" style={{ fontWeight: 800, fontSize: 28 }}>1612</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 700 }}>En yüksek</div><div className="num" style={{ fontWeight: 700, fontSize: 17, color: 'var(--win)' }}>1612</div></div>
          </div>
          <EloChart data={data} season={[0, 11]} />
          <div style={{ display: 'flex', gap: 14, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            {[['◆ Sezon başı', 'var(--border-strong)'], ['● Tıklanabilir nokta', 'var(--clay)']].map(([l]) => <span key={l} style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>{l}</span>)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['+412', 'Toplam kazanım', 'var(--win)'], ['23', 'Maç', 'var(--text)'], ['2', 'Sezon', 'var(--text)']].map(([v, l, c]) => (
            <div key={l} style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '12px 4px', textAlign: 'center' }}><div className="num" style={{ fontWeight: 800, fontSize: 19, color: c }}>{v}</div><div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>{l}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- 37: badges (with pin flow) ----------
function Badges() {
  const { nav } = useApp();
  const earned = ME.badges.concat(['first_win', 'social', 'marathon']);
  const [pinned, setPinned] = pfS(ME.badges.slice(0, 3));
  const togglePin = (k) => setPinned(p => p.includes(k) ? p.filter(x => x !== k) : p.length < 3 ? [...p, k] : p);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Rozetler" subtitle={`${earned.length}/${BADGES.length} kazanıldı`} />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 18px 24px' }}>
        <div style={{ background: 'var(--clay-softer)', border: '1px solid var(--clay-soft)', borderRadius: 'var(--r-md)', padding: 13, marginBottom: 16, display: 'flex', gap: 10 }}>
          <Icon name="star" size={18} color="var(--clay)" />
          <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>Profilinde gösterilecek <b>3 rozet</b> seç. Seçilenler isim yanında her yerde görünür. ({pinned.length}/3)</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {BADGES.map(b => { const has = earned.includes(b.key); const isPin = pinned.includes(b.key); return (
            <div key={b.key} onClick={() => has && togglePin(b.key)} style={{ position: 'relative', background: 'var(--surface)', border: `1.5px solid ${isPin ? 'var(--clay)' : 'var(--border)'}`, borderRadius: 'var(--r-md)', padding: '16px 12px', textAlign: 'center', cursor: has ? 'pointer' : 'default', opacity: has ? 1 : 0.55 }}>
              {isPin && <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={11} color="#fff" stroke={3} /></div>}
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: has ? 'color-mix(in srgb, ' + b.color + ' 14%, transparent)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Icon name={has ? b.icon : 'lock'} size={22} color={has ? b.color : 'var(--text-3)'} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 13.5, filter: has ? 'none' : 'grayscale(1)' }}>{b.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.35 }}>{b.desc}</div>
            </div>
          ); })}
        </div>
      </div>
      <div style={{ padding: '8px 18px 26px' }}><Button full size="lg" onClick={() => { nav.toast('Vitrin güncellendi'); nav.back(); }}>Vitrini kaydet</Button></div>
    </div>
  );
}

// ---------- 38: stats ----------
function Stats() {
  const { nav } = useApp();
  const big = [['67%', 'Kazanma oranı'], ['26', 'Toplam maç'], ['5', 'En uzun seri'], ['+412', 'ELO kazanımı']];
  const facts = [['pin', 'En sık kort', 'Kort 1', '14 maç'], ['spark', 'En sık format', 'Klasik', '18 maç'], ['user', 'En sık rakip', 'Berk Aydın', '5 maç'], ['flame', 'Mevcut seri', '3 galibiyet', 'devam ediyor']];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="İstatistikler" />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 18px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {big.map(([v, l]) => (
            <div key={l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 14px' }}>
              <div className="num" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-.02em' }}>{v}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
        {/* W/L bar */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--win)' }}>{ME.wl[0]} Galibiyet</span><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--loss)' }}>{ME.wl[1]} Mağlubiyet</span></div>
          <div style={{ display: 'flex', height: 12, borderRadius: 'var(--r-pill)', overflow: 'hidden', gap: 2 }}>
            <div style={{ flex: ME.wl[0], background: 'var(--win)' }} /><div style={{ flex: ME.wl[1], background: 'var(--loss)' }} />
          </div>
        </div>
        <SectionLabel>Öne çıkanlar</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {facts.map(([ic, l, v, sub], i) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={18} color="var(--clay)" /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 600 }}>{l}</div><div style={{ fontWeight: 700, fontSize: 15 }}>{v}</div></div>
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- 40: settings ----------
function Settings() {
  const { nav } = useApp();
  const [push, setPush] = pfS(true);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Ayarlar" />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 16px 24px' }}>
        <SectionLabel>Bildirimler</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 18 }}>
          <ListRow icon="bell" title="Push bildirimleri" subtitle="Tüm bildirimler" right={<Toggle value={push} onChange={setPush} />} />
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <ListRow icon="list" title="Bildirim tercihleri" subtitle="8 kategori" chevron onClick={() => nav.go('notif_prefs')} />
        </div>
        <SectionLabel>Hesap</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 18 }}>
          <ListRow icon="ranking" title="Yarışma kategorisi" subtitle="Erkek · değiştir" chevron onClick={() => nav.toast('Kategori değiştirme')} />
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <ListRow icon="eye" title="Gizlilik" subtitle="Bölüm, sınıf görünürlüğü" chevron onClick={() => nav.toast('Gizlilik')} />
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <ListRow icon="user" title="Profili düzenle" chevron onClick={() => nav.toast('Profil düzenle')} />
        </div>
        <SectionLabel>Diğer</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 18 }}>
          <ListRow icon="info" title="Hakkında & kurallar" chevron onClick={() => nav.toast('Hakkında')} />
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <ListRow icon="shield" title="Admin paneli" subtitle="Yalnızca yöneticiler" chevron onClick={() => nav.go('admin_home')} />
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <ListRow icon="swap" title="Çıkış yap" onClick={() => nav.reset('welcome')} />
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <ListRow icon="trash" title="Hesabı sil" danger onClick={() => nav.go('delete_account')} />
        </div>
        <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-3)', marginTop: 18 }} className="num">Tennis Challenger · v1.0.0</div>
      </div>
    </div>
  );
}

// ---------- 41: notif prefs ----------
function NotifPrefs() {
  const { nav } = useApp();
  const cats = [['bolt', 'Maç teklifleri', 'Sana gelen meydan okumalar'], ['check', 'Maç onayları', 'Skor onayı/itiraz'], ['ranking', 'Sıralama değişimi', 'Rank yükselişi/düşüşü'], ['flame', 'Rozet kazanımı', 'Yeni rozetler'], ['trophy', 'Sezon & finaller', 'Finale window, bracket'], ['megaphone', 'Topluluk duyuruları', 'Admin duyuruları'], ['handshake', 'Açık ilanlar', 'Sana uygun yeni ilanlar'], ['clock', 'Hatırlatmalar', 'Yaklaşan maç hatırlatması']];
  const [state, setState] = pfS(Object.fromEntries(cats.map((_, i) => [i, i !== 2])));
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Bildirim Tercihleri" />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 16px 24px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {cats.map(([ic, t, s], i) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={18} color="var(--clay)" /></div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14.5 }}>{t}</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{s}</div></div>
              <Toggle value={state[i]} onChange={v => setState(st => ({ ...st, [i]: v }))} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- 42: delete account ----------
function DeleteAccount() {
  const { nav } = useApp();
  const [step, setStep] = pfS(1);
  const [confirm, setConfirm] = pfS('');
  if (step === 1) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Hesabı Sil" />
      <div className="scroll-y" style={{ flex: 1, padding: '12px 22px 20px' }}>
        <div style={{ width: 60, height: 60, borderRadius: 'var(--r-lg)', background: 'color-mix(in srgb, var(--loss) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}><Icon name="warn" size={30} color="var(--loss)" /></div>
        <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.02em', margin: '0 0 10px' }}>Emin misin?</h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 18 }}>Hesabını silmek geri alınamaz. Ancak <b>maç geçmişin ve ELO kayıtların sıralama bütünlüğü için anonimleştirilerek korunur</b> (“Silinmiş Oyuncu” olarak).</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['Profilin ve kişisel verilerin silinir', 'x'], ['Rozetlerin ve vitrinin kaldırılır', 'x'], ['Geçmiş maçların anonim olarak kalır', 'info']].map(([t, ic]) => (
            <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon name={ic === 'x' ? 'xCircle' : 'info'} size={18} color={ic === 'x' ? 'var(--loss)' : 'var(--info)'} /><span style={{ fontSize: 13.5, color: 'var(--text-2)' }}>{t}</span></div>
          ))}
        </div>
      </div>
      <div style={{ padding: '8px 22px 26px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button full size="lg" variant="secondary" onClick={() => nav.back()}>Vazgeç</Button>
        <Button full size="lg" variant="danger" onClick={() => setStep(2)}>Devam et</Button>
      </div>
    </div>
  );
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => setStep(1)} title="Son onay" />
      <div className="scroll-y" style={{ flex: 1, padding: '12px 22px 20px' }}>
        <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 20 }}>Onaylamak için aşağıya <b style={{ color: 'var(--text)' }}>SİL</b> yaz.</p>
        <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="SİL" autoFocus style={{ width: '100%', height: 56, padding: '0 16px', textAlign: 'center', fontSize: 18, fontWeight: 800, letterSpacing: '.2em', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
      </div>
      <div style={{ padding: '8px 22px 26px' }}>
        <Button full size="lg" variant="danger" disabled={confirm.trim().toUpperCase() !== 'SİL' && confirm.trim().toUpperCase() !== 'SIL'} onClick={() => { nav.toast('Hesap silindi'); nav.reset('welcome'); }}>Hesabımı kalıcı olarak sil</Button>
      </div>
    </div>
  );
}

registerScreens([
  { id: 'profile', group: 'Profil & Gamification', title: 'Profil', comp: Profile, tab: 'profile' },
  { id: 'elo_history', group: 'Profil & Gamification', title: 'ELO geçmişi', comp: EloHistory },
  { id: 'badges', group: 'Profil & Gamification', title: 'Rozetler', comp: Badges },
  { id: 'stats', group: 'Profil & Gamification', title: 'İstatistikler', comp: Stats },
  { id: 'settings', group: 'Profil & Gamification', title: 'Ayarlar', comp: Settings },
  { id: 'notif_prefs', group: 'Profil & Gamification', title: 'Bildirim tercihleri', comp: NotifPrefs },
  { id: 'delete_account', group: 'Profil & Gamification', title: 'Hesap silme', comp: DeleteAccount },
]);
