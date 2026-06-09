/* global React, window, useApp, Icon, Avatar, Button, GreetHeader, Sparkline, FormatChip, levelForElo, levelProgress, eloTrend, ME */
// ============================================================
// HOME / ANASAYFA — greeting · ELO hero w/ mini trend · Yeni Maç CTA ·
// aktif maçlar · son sonuçlar · sezon geri sayım banner.
// Built from existing components + flat design language.
// ============================================================

const HOME_ACTIVE = [
  { opp: 'Berk Aydın', kind: 'ranking', format: 'klasik', when: 'Bugün 18:30', court: 'Kort 1' },
  { opp: 'Mert Şahin', kind: 'friendly', format: 'tiebreak', when: 'Yarın 12:00', court: 'Kort 2' },
];
const HOME_RECENT = [
  { opp: 'Onur Çelik', win: true, score: '4-2', delta: +22, when: '2 gün önce' },
  { opp: 'Eren Doğan', win: false, score: '3-4', delta: -14, when: '5 gün önce' },
];

function SectionTitle({ children, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '20px 4px 11px' }}>
      <span style={{ fontWeight: 800, fontSize: 16, fontFamily: 'var(--font-display)', letterSpacing: '-.01em' }}>{children}</span>
      {action && <button onClick={onAction} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>{action}</button>}
    </div>
  );
}

function HomeActiveCard({ m }) {
  const { nav } = useApp();
  const ranked = m.kind === 'ranking';
  return (
    <div onClick={() => nav.go('matches_upcoming')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: 'var(--surface)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
      <Avatar name={m.opp} round size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontWeight: 700, fontSize: 14.5 }}>{m.opp}</span>
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em', color: ranked ? 'var(--court)' : 'var(--pink-deep)', background: ranked ? 'var(--blue-soft)' : 'var(--pink-soft)', padding: '2px 7px', borderRadius: 'var(--r-pill)' }}>{ranked ? 'SIRALAMA' : 'DOSTLUK'}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginTop: 3 }}>{m.when} · {m.court}</div>
      </div>
      <Icon name="chevR" size={20} color="var(--text-3)" />
    </div>
  );
}

function HomeRecentCard({ m }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-md)' }}>
      <div style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)', background: m.win ? 'var(--lime-soft)' : '#FCE6E4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: m.win ? 'var(--win)' : 'var(--loss)' }}>{m.win ? 'G' : 'M'}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{m.opp}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>{m.when}</div>
      </div>
      <span className="num" style={{ fontWeight: 800, fontSize: 18 }}>{m.score}</span>
      <span className="num" style={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontWeight: 700, fontSize: 13, color: m.delta >= 0 ? 'var(--win)' : 'var(--loss)', minWidth: 38, justifyContent: 'flex-end' }}>
        <Icon name={m.delta >= 0 ? 'chevU' : 'chevD'} size={13} color={m.delta >= 0 ? 'var(--win)' : 'var(--loss)'} stroke={3} />{Math.abs(m.delta)}
      </span>
    </div>
  );
}

function Home({ params }) {
  const { nav } = useApp();
  const lv = levelForElo(ME.elo);
  const lp = levelProgress(ME.elo);
  const trend = eloTrend({ name: ME.name, elo: ME.elo }, 10);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <GreetHeader name={ME.name} sub="Bugün maç günü mü?" onBell={() => nav.go('notifs')} badge />
      <div className="scroll-y" style={{ flex: 1, minHeight: 0, padding: '8px 16px 24px' }}>

        {/* ELO HERO — court blue, mini trend */}
        <div style={{ background: 'var(--court)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-lg)', padding: 18, color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: 'rgba(255,255,255,.72)' }}>GÜNCEL ELO · ERKEK TEK</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, marginTop: 4 }}>
                <span className="num" style={{ fontWeight: 800, fontSize: 42, lineHeight: .9, letterSpacing: '-.02em' }}>{ME.elo}</span>
                <span className="num" style={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontWeight: 800, fontSize: 14, color: 'var(--lime)', marginBottom: 5 }}><Icon name="chevU" size={14} color="var(--lime)" stroke={3} />22</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="num" style={{ fontWeight: 800, fontSize: 26, lineHeight: 1 }}>#{ME.rank}</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.7)', letterSpacing: '.06em', marginTop: 3 }}>SIRA</div>
            </div>
          </div>

          {/* mini trend */}
          <div style={{ marginTop: 14, background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.28)', borderRadius: 'var(--r-md)', padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.7)' }}>Son 10 maç</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>Yükselişte · {lv.name}</div>
            </div>
            <Sparkline data={trend} color="var(--lime)" w={104} h={30} stroke={2.5} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11 }}>
            <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,.22)', borderRadius: 'var(--r-pill)', overflow: 'hidden' }}><div style={{ width: `${Math.round(lp.pct * 100)}%`, height: '100%', background: 'var(--lime)' }} /></div>
            <span className="num" style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.85)' }}>{lp.next ? `${lp.next.name}’e ${lp.toNext}` : 'Maks seviye'}</span>
          </div>
        </div>

        {/* Yeni Maç CTA */}
        <div style={{ display: 'flex', gap: 11, marginTop: 13 }}>
          <button onClick={() => nav.go('new_match_type')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, height: 56, borderRadius: 'var(--r-pill)', border: '1.5px solid var(--border-strong)', background: 'var(--lime)', color: 'var(--on-lime)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 15.5, whiteSpace: 'nowrap' }}>
            <Icon name="plus" size={22} color="var(--on-lime)" stroke={2.8} /> Yeni Maç
          </button>
          <button onClick={() => nav.go('leaderboard')} style={{ width: 56, height: 56, borderRadius: '50%', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="ranking" size={22} color="var(--text)" />
          </button>
        </div>

        {/* Aktif maçlar */}
        <SectionTitle action="Tümü" onAction={() => nav.go('matches_upcoming')}>Aktif maçlar</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {HOME_ACTIVE.map((m, i) => <HomeActiveCard key={i} m={m} />)}
        </div>

        {/* Son sonuçlar */}
        <SectionTitle action="Geçmiş" onAction={() => nav.go('match_history')}>Son sonuçlar</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {HOME_RECENT.map((m, i) => <HomeRecentCard key={i} m={m} />)}
        </div>

        {/* Sezon banner */}
        <div onClick={() => nav.go('season')} style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 13, padding: '15px 16px', background: 'var(--clay-softer)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-lg)', cursor: 'pointer' }}>
          <div style={{ width: 46, height: 46, borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="trophy" size={23} color="var(--clay-text)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>Güz Sezonu finali yaklaşıyor</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginTop: 2 }}>İlk 8’desin · finaleye <b className="num" style={{ color: 'var(--clay-text)' }}>41 gün</b> kaldı</div>
          </div>
          <Icon name="chevR" size={20} color="var(--text-3)" />
        </div>

      </div>
    </div>
  );
}

window.Home = Home;
if (window.registerScreens) window.registerScreens([{ id: 'home', group: 'Anasayfa', title: 'Anasayfa', comp: Home, tab: 'home' }]);
