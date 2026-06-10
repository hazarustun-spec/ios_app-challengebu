/* global React, window, useApp, Icon, NavHeader, Avatar, Button, Chip, Segmented, Progress, EmptyState, LEADERBOARD, levelForElo, LevelIcon */
// ============================================================
// SEASON + TOURNAMENT  (screens 43-46)
// ============================================================
const { useState: ssS } = React;

// ---------- 43: active season ----------
function Season() {
  const { nav } = useApp();
  const top = LEADERBOARD.erkek_tek.slice(0, 5);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader large title="Güz Sezonu" subtitle="1 Eyl – 15 Oca · Aktif ladder" actionIcon="clock" onAction={() => nav.go('season_archive')} />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 18px 24px' }}>
        {/* countdown hero */}
        <div style={{ background: 'var(--court)', borderRadius: 'var(--r-xl)', padding: 20, color: '#fff', marginBottom: 16, border: '1.5px solid var(--border-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, opacity: .85 }}>Finale window’a</div>
              <div className="num" style={{ fontWeight: 800, fontSize: 40, letterSpacing: '-.03em', lineHeight: 1 }}>41 gün</div>
              <div style={{ fontSize: 12.5, opacity: .85, marginTop: 4 }}>16–25 Ocak · son 10 gün</div>
            </div>
            <Icon name="trophy" size={32} color="rgba(255,255,255,.9)" />
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ height: 7, background: 'rgba(255,255,255,.25)', borderRadius: 'var(--r-pill)', overflow: 'hidden' }}><div style={{ width: '72%', height: '100%', background: '#fff', borderRadius: 'var(--r-pill)' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 11, fontWeight: 600, opacity: .85 }}><span>Sezon %72</span><span>Top 8 finale gider</span></div>
          </div>
        </div>

        {/* my standing */}
        <div style={{ background: 'var(--clay-softer)', border: '1px solid var(--clay-soft)', borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--r-sm)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><span className="num" style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 700 }}>SEN</span><span className="num" style={{ fontSize: 18, fontWeight: 800, color: 'var(--clay)' }}>4</span></div>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14.5 }}>Erkek Tek · 4. sırada</div><div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2 }}>Finale için ilk 8’desin 🎯</div></div>
          <Icon name="chevR" size={18} color="var(--text-3)" />
        </div>

        {/* finale calendar */}
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Finale Takvimi</div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 16 }}>
          {[['Çeyrek Final', '16–19 Oca', 'BÜ Klasik', 'flame'], ['Yarı Final', '20–22 Oca', 'BÜ Klasik', 'bolt'], ['Final', '24–25 Oca', '3 Set Klasik', 'trophy']].map(([t, d, f, ic], i) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={18} color="var(--clay)" /></div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14.5 }}>{t}</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{f}</div></div>
              <span className="num" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-2)' }}>{d}</span>
            </div>
          ))}
        </div>
        <Button full size="lg" variant="secondary" icon="trophy" onClick={() => nav.go('bracket')}>Finale bracket’ını gör</Button>
        <button onClick={() => nav.go('annual_champ')} style={{ width: '100%', marginTop: 10, padding: 13, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13.5, color: 'var(--clay)', fontFamily: 'var(--font-sans)' }}>Yıllık şampiyonluk yarışı →</button>
      </div>
    </div>
  );
}

// ---------- 44: bracket ----------
function Slot({ name, elo, win, top }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px', background: win ? 'var(--clay-softer)' : 'var(--surface)', borderTop: top ? 'none' : '1px solid var(--border)' }}>
      {name ? <Avatar name={name} size={22} /> : <div style={{ width: 22, height: 22, borderRadius: 'var(--r-xs)', background: 'var(--surface-3)' }} />}
      <span style={{ flex: 1, fontSize: 11.5, fontWeight: win ? 800 : 600, color: name ? 'var(--text)' : 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name ? name.split(' ')[0] : '—'}</span>
      {win && <Icon name="check" size={12} color="var(--clay)" stroke={3} />}
    </div>
  );
}
function Match({ a, b }) {
  return <div style={{ width: 124, border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}><Slot {...a} top /><Slot {...b} /></div>;
}
// doubles slot — two stacked players per side
function TeamSlot({ team, win, top }) {
  return (
    <div style={{ padding: '7px 9px', background: win ? 'var(--clay-softer)' : 'var(--surface)', borderTop: top ? 'none' : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: -4 }}>
          {team ? <>
            <Avatar name={team[0]} size={20} />
            <div style={{ marginLeft: -6 }}><Avatar name={team[1]} size={20} /></div>
          </> : <div style={{ width: 20, height: 20, borderRadius: 'var(--r-xs)', background: 'var(--surface-3)' }} />}
        </div>
        {win && <Icon name="check" size={12} color="var(--clay)" stroke={3} />}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: win ? 800 : 600, color: team ? 'var(--text)' : 'var(--text-3)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team ? `${team[0].split(' ')[0]} & ${team[1].split(' ')[0]}` : '—'}</div>
    </div>
  );
}
function TeamMatch({ a, b }) {
  return <div style={{ width: 138, border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}><TeamSlot {...a} top /><TeamSlot {...b} /></div>;
}
function Bracket({ params = {} }) {
  const { nav } = useApp();
  if (params.doubles) return <DoublesBracket />;
  const qf = [[{ name: 'Kaan Demir', win: true }, { name: 'Eren Doğan' }], [{ name: 'Mert Şahin', win: true }, { name: 'Ali Koç' }], [{ name: 'Berk Aydın', win: true }, { name: 'Onur Çelik' }], [{ name: 'Emre Yıldız', win: true }, { name: 'Can Öztürk' }]];
  const sf = [[{ name: 'Kaan Demir', win: true }, { name: 'Mert Şahin' }], [{ name: 'Berk Aydın' }, { name: 'Emre Yıldız', win: true }]];
  const f = [{ name: 'Kaan Demir', win: true }, { name: 'Emre Yıldız' }];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Sezon Finali" subtitle="Erkek Tek · Top 8 · tek eleme" />
      <div className="scroll-y" style={{ flex: 1, overflowX: 'auto', padding: '12px 16px 24px' }}>
        <div style={{ display: 'flex', gap: 18, minWidth: 'max-content', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Çeyrek</div>
            {qf.map((m, i) => <Match key={i} a={m[0]} b={m[1]} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center', height: '100%' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Yarı</div>
            {sf.map((m, i) => <div key={i} style={{ margin: '34px 0' }}><Match a={m[0]} b={m[1]} /></div>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--clay)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Final · 3 Set</div>
            <Match a={f[0]} b={f[1]} />
            <div style={{ marginTop: 14, textAlign: 'center', background: 'var(--court)', borderRadius: 'var(--r-md)', padding: '14px 12px', width: 124, border: '1.5px solid var(--border-strong)' }}>
              <Icon name="crown" size={24} color="#fff" />
              <div style={{ fontWeight: 800, fontSize: 13, color: '#fff', marginTop: 4 }}>Kaan Demir</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.85)', fontWeight: 600 }}>Şampiyon</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 44b: doubles bracket (4 teams) ----------
function DoublesBracket() {
  const { nav } = useApp();
  const sf = [
    [{ team: ['Kaan Demir', 'Mert Şahin'], win: true }, { team: ['Ali Koç', 'Onur Çelik'] }],
    [{ team: ['Berk Aydın', 'Eren Doğan'] }, { team: ['Emre Yıldız', 'Can Öztürk'], win: true }],
  ];
  const f = [{ team: ['Kaan Demir', 'Mert Şahin'], win: true }, { team: ['Emre Yıldız', 'Can Öztürk'] }];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Sezon Finali" subtitle="Erkek Çift · Top 4 · tek eleme" />
      <div className="scroll-y" style={{ flex: 1, overflowX: 'auto', padding: '12px 16px 24px' }}>
        <div style={{ display: 'flex', gap: 22, minWidth: 'max-content', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Yarı Final</div>
            {sf.map((m, i) => <TeamMatch key={i} a={m[0]} b={m[1]} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--clay)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Final · 3 Set</div>
            <TeamMatch a={f[0]} b={f[1]} />
            <div style={{ marginTop: 14, textAlign: 'center', background: 'var(--court)', borderRadius: 'var(--r-md)', padding: '14px 12px', width: 138, border: '1.5px solid var(--border-strong)' }}>
              <Icon name="crown" size={24} color="#fff" />
              <div style={{ fontWeight: 800, fontSize: 12.5, color: '#fff', marginTop: 4 }}>Kaan &amp; Mert</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.85)', fontWeight: 600 }}>Çift Şampiyon</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 45: annual champion ----------
function AnnualChamp() {
  const { nav } = useApp();
  const rows = [['Kaan Demir', 270, ['Güz Şampiyon', 'Bahar Finalist']], ['Emre Yıldız', 190, ['Güz Finalist', 'Yaz Şampiyon']], ['Berk Aydın', 145, ['Güz Yarı F.', 'Bahar Yarı F.']], ['Mert Şahin', 95, ['Güz Yarı F.']], ['Arda Yılmaz', 50, ['Bahar Çeyrek']]];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Yıllık Şampiyonluk" subtitle="2025–26 · finale puanları" />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 18px 24px' }}>
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 14, marginBottom: 16, display: 'flex', gap: 10 }}>
          <Icon name="info" size={18} color="var(--info)" />
          <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>Her sezon finalinden puan: Şampiyon 100 · Finalist 70 · Yarı F. 50 · Çeyrek F. 25. Yıl sonu en yüksek <b>🏆 Yıllık Şampiyon</b> olur (kalıcı rozet).</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(([n, pts, tags], i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: i === 0 ? 'color-mix(in srgb, #C9982E 12%, var(--surface))' : 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-md)' }}>
              <span className="num" style={{ width: 22, textAlign: 'center', fontWeight: 800, fontSize: 16, color: i === 0 ? '#C9982E' : 'var(--text-3)' }}>{i + 1}</span>
              <Avatar name={n} size={40} ring={i === 0 ? '#C9982E' : undefined} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ fontWeight: 700, fontSize: 14.5 }}>{n}</span>{i === 0 && <Icon name="trophy" size={15} color="#C9982E" />}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tags.join(' · ')}</div>
              </div>
              <div className="num" style={{ fontWeight: 800, fontSize: 18, color: i === 0 ? '#C9982E' : 'var(--text)' }}>{pts}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- 46: archive ----------
function SeasonArchive() {
  const { nav } = useApp();
  const seasons = [['Yaz 2025', 'Kaan Demir', '1 Tem – 20 Ağu', true], ['Bahar 2025', 'Emre Yıldız', '26 Oca – 20 Haz', false], ['Güz 2024', 'Kaan Demir', '1 Eyl – 15 Oca', true], ['Yaz 2024', 'Berk Aydın', '1 Tem – 20 Ağu', false]];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Geçmiş Sezonlar" />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {seasons.map(([s, champ, dates, ann]) => (
          <div key={s} onClick={() => nav.go('bracket')} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{s}</span>
              <span className="num" style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{dates}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
              <Icon name="crown" size={20} color="#C9982E" />
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Şampiyon</div><div style={{ fontWeight: 700, fontSize: 14 }}>{champ}</div></div>
              {ann && <Chip color="#C9982E" bg="color-mix(in srgb,#C9982E 12%,transparent)" icon="trophy">Yıllık</Chip>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

registerScreens([
  { id: 'season', group: 'Sezon & Turnuva', title: 'Aktif sezon', comp: Season },
  { id: 'bracket', group: 'Sezon & Turnuva', title: 'Finale bracket', comp: Bracket },
  { id: 'bracket_doubles', group: 'Sezon & Turnuva', title: 'Finale bracket · çift', comp: (p) => <Bracket params={{ doubles: true }} /> },
  { id: 'annual_champ', group: 'Sezon & Turnuva', title: 'Yıllık şampiyon', comp: AnnualChamp },
  { id: 'season_archive', group: 'Sezon & Turnuva', title: 'Geçmiş sezonlar', comp: SeasonArchive },
]);
