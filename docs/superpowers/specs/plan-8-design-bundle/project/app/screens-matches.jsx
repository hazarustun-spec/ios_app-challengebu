/* global React, window, useApp, Icon, NavHeader, Avatar, NameLine, Chip, Segmented, Button, EmptyState, FORMATS, COURTS, LEADERBOARD, ME, levelForElo */
// ============================================================
// MATCHES — upcoming / offers / open feed / history / applicants
// (screens 21, 22, 23, 33, 34)
// ============================================================
const { useState: mS } = React;

const fmtChip = (key) => <FormatChip fmtKey={key} />;

const UPCOMING = [
  { opp: 'Berk Aydın', kind: 'ranking', format: 'klasik', cat: 'Erkek Tek', date: 'Bugün', time: '18:30', court: 'Kort 1', status: 'confirmed' },
  { opp: 'Mert Şahin', kind: 'friendly', format: 'tiebreak', cat: 'Dostluk', date: 'Yarın', time: '12:00', court: 'Kort 2', status: 'confirmed' },
  { opp: 'Deniz Arslan', kind: 'ranking', format: 'proset', cat: 'Erkek Tek', date: '8 Haz', time: '20:00', court: 'Bebek Kort', status: 'pending' },
];
const OFFERS = [
  { from: 'Emre Yıldız', elo: 1788, format: 'klasik', cat: 'Erkek Tek', time: 'Cmt 14:00', court: 'Kort 1', kind: 'ranking' },
  { from: 'Onur Çelik', elo: 1432, format: 'set3', cat: 'Open Tek', time: 'Paz 11:00', court: 'Kort 2', kind: 'ranking' },
];
const LISTINGS = [
  { from: 'Can Öztürk', elo: 1598, format: 'klasik', cat: 'Erkek Tek', window: 'Bu hafta · akşamları', court: 'Esnek', applicants: 4, kind: 'ranking' },
  { from: 'Ada Çelik', elo: 1498, format: 'tiebreak', cat: 'Open Tek', window: 'Hafta sonu · sabah', court: 'Kort 1', applicants: 2, kind: 'friendly' },
  { from: 'Ali Koç', elo: 1487, format: 'proset', cat: 'Erkek Tek', window: 'Yarın 19:00', court: 'Kort 2', applicants: 0, kind: 'ranking' },
];
const HISTORY = [
  { opp: 'Tolga Aksoy', win: true, score: '4-1', format: 'klasik', date: '2 Haz', delta: +18, cat: 'Erkek Tek' },
  { opp: 'Sinan Polat', win: true, score: '4-0', format: 'klasik', date: '29 May', delta: +24, cat: 'Erkek Tek' },
  { opp: 'Berk Aydın', win: false, score: '6-8', format: 'proset', date: '24 May', delta: -15, cat: 'Erkek Tek' },
  { opp: 'Emre Yıldız', win: false, score: '3-3', format: 'klasik', date: '19 May', delta: 0, cat: 'Erkek Tek', void: true },
  { opp: 'Deniz Arslan', win: true, score: '10-6', format: 'tiebreak', date: '14 May', delta: +12, cat: 'Open Tek' },
];

function KindDot({ kind }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: kind === 'ranking' ? 'var(--clay-text)' : 'var(--pink-deep)' }}>
    <Icon name={kind === 'ranking' ? 'trophy' : 'handshake'} size={13} color={kind === 'ranking' ? 'var(--clay)' : 'var(--pink-deep)'} />
    {kind === 'ranking' ? 'Sıralama' : 'Dostluk'}
  </span>;
}

function MatchesHub({ params }) {
  const { nav } = useApp();
  const [tab, setTab] = mS(params.view || 'upcoming');
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader large title="Maçlar" actionIcon="clock" onAction={() => nav.go('match_history')} />
      <div style={{ padding: '6px 18px 10px' }}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'upcoming', label: 'Yaklaşan' }, { value: 'offers', label: 'Teklifler' }, { value: 'feed', label: 'İlanlar' }]} />
      </div>
      <div className="scroll-y" style={{ flex: 1, padding: '4px 16px 24px' }}>
        {tab === 'upcoming' && <UpcomingList />}
        {tab === 'offers' && <OffersList />}
        {tab === 'feed' && <FeedList />}
      </div>
    </div>
  );
}

function UpcomingList() {
  const { nav } = useApp();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {UPCOMING.map((m, i) => (
        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={m.opp} size={46} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15.5 }}>{m.opp}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}><KindDot kind={m.kind} /><span style={{ fontSize: 12, color: 'var(--text-3)' }}>· {m.cat}</span></div>
            </div>
            {m.status === 'pending'
              ? <Chip color="var(--warn)" bg="var(--warn-soft)" icon="clock">Onay bekliyor</Chip>
              : <Chip color="var(--win)" bg="var(--grass-soft)" icon="check">Onaylı</Chip>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px 12px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}><Icon name="calendar" size={15} color="var(--text-3)" />{m.date} · {m.time}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}><Icon name="pin" size={15} color="var(--text-3)" />{m.court}</span>
            {fmtChip(m.format)}
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px' }}>
            <Button variant="secondary" size="sm" icon="info" onClick={() => nav.go('format_rules', { format: m.format })} style={{ flex: 1 }}>Kurallar</Button>
            <Button size="sm" icon="spark" onClick={() => nav.go('active_match', { opp: m.opp, format: m.format })} style={{ flex: 1.4 }}>Skor gir</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function OffersList() {
  const { nav } = useApp();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {OFFERS.map((m, i) => { const lv = levelForElo(m.elo); return (
        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Avatar name={m.from} size={46} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15.5 }}>{m.from}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>sana <KindDot kind={m.kind} /> maçı için meydan okudu</div>
            </div>
            <div className="num" style={{ fontWeight: 700, fontSize: 17, color: lv.color }}>{m.elo}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 13, flexWrap: 'wrap' }}>
            {fmtChip(m.format)}
            <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600 }}>{m.time} · {m.court}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="danger" size="sm" onClick={() => nav.toast('Teklif reddedildi')} style={{ flex: 1 }}>Reddet</Button>
            <Button size="sm" icon="check" onClick={() => nav.toast('Maç onaylandı · takvimine eklendi')} style={{ flex: 1.6 }}>Kabul et</Button>
          </div>
        </div>
      ); })}
    </div>
  );
}

function FeedList() {
  const { nav } = useApp();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {LISTINGS.map((m, i) => { const lv = levelForElo(m.elo); return (
        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Avatar name={m.from} size={42} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{m.from} <span className="num" style={{ color: lv.color, fontWeight: 700 }}>· {m.elo}</span></div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 1 }}>{m.cat}</div>
            </div>
            {m.applicants > 0 && <Chip color="var(--text-2)" icon="user">{m.applicants}</Chip>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 13, flexWrap: 'wrap' }}>
            {fmtChip(m.format)}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600 }}><Icon name="clock" size={14} color="var(--text-3)" />{m.window}</span>
          </div>
          <Button full size="sm" variant={m.applicants > 0 ? 'secondary' : 'primary'} icon="flag" onClick={() => nav.toast('Başvurun gönderildi')}>İlana başvur</Button>
        </div>
      ); })}
      <button onClick={() => nav.go('open_applicants')} style={{ marginTop: 4, padding: '13px', textAlign: 'center', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13.5, color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>Kendi ilanına başvuranları gör →</button>
    </div>
  );
}

// ---------- Match history (33) ----------
function MatchHistory() {
  const { nav } = useApp();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Geçmiş Maçlar" actionIcon="filter" onAction={() => nav.toast('Filtre')} />
      <div className="scroll-y" style={{ flex: 1, padding: '6px 16px 24px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[['18', 'Galibiyet', 'var(--win)'], ['9', 'Mağlubiyet', 'var(--loss)'], ['67%', 'Oran', 'var(--text)']].map(([v, l, c]) => (
            <div key={l} style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '12px 4px', textAlign: 'center' }}>
              <div className="num" style={{ fontWeight: 800, fontSize: 21, color: c }}>{v}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {HISTORY.map((m, i) => (
            <div key={i} onClick={() => nav.go('match_summary', { opp: m.opp, win: m.win, score: m.score, format: m.format, readonly: true })} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
              <div style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, background: m.void ? 'var(--warn)' : m.win ? 'var(--win)' : 'var(--loss)' }} />
              <Avatar name={m.opp} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{m.opp}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{FORMATS.find(f => f.key === m.format).name} · {m.date}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="num" style={{ fontWeight: 700, fontSize: 17 }}>{m.score}</div>
                <div className="num" style={{ fontSize: 12, fontWeight: 700, color: m.void ? 'var(--warn)' : m.delta > 0 ? 'var(--win)' : m.delta < 0 ? 'var(--loss)' : 'var(--text-3)', marginTop: 1 }}>{m.void ? 'voided' : (m.delta > 0 ? '+' : '') + m.delta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Open listing applicants (34) ----------
function OpenApplicants() {
  const { nav } = useApp();
  const apps = [
    { name: 'Mert Şahin', elo: 1655, note: 'Yarın akşam müsaitim, Kort 1 olur.' },
    { name: 'Onur Çelik', elo: 1432, note: 'Bu hafta sonu sabah?' },
    { name: 'Eren Doğan', elo: 1320, note: 'Her zaman varım 🎾' },
  ];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Başvuranlar" subtitle="İlanın · Erkek Tek · Klasik" />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 16px 24px' }}>
        <div style={{ background: 'var(--clay-softer)', border: '1px solid var(--clay-soft)', borderRadius: 'var(--r-md)', padding: 14, marginBottom: 14, display: 'flex', gap: 10 }}>
          <Icon name="info" size={18} color="var(--clay)" />
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>Birini kabul ettiğinde ilan kapanır ve maç oluşturulur. {apps.length} kişi başvurdu.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {apps.map((a, i) => { const lv = levelForElo(a.elo); return (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <Avatar name={a.name} size={44} />
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div><div className="num" style={{ fontSize: 13, fontWeight: 700, color: lv.color }}>{a.elo} · {lv.name}</div></div>
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '0 0 12px', lineHeight: 1.45, background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>“{a.note}”</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => nav.toast('Önizleme')} style={{ flex: 1 }}>Profil</Button>
                <Button size="sm" icon="check" onClick={() => { nav.toast('Maç oluşturuldu'); nav.back(); }} style={{ flex: 1.4 }}>Kabul et</Button>
              </div>
            </div>
          ); })}
        </div>
      </div>
    </div>
  );
}

registerScreens([
  { id: 'matches_upcoming', group: 'Maçlar', title: 'Yaklaşan maçlar', comp: MatchesHub, tab: 'matches' },
  { id: 'match_offers', group: 'Maçlar', title: 'Gelen teklifler', comp: (p) => <MatchesHub params={{ view: 'offers' }} />, tab: 'matches' },
  { id: 'open_feed', group: 'Maçlar', title: 'Açık ilan feed', comp: (p) => <MatchesHub params={{ view: 'feed' }} />, tab: 'matches' },
  { id: 'match_history', group: 'Maçlar', title: 'Geçmiş maçlar', comp: MatchHistory },
  { id: 'open_applicants', group: 'Maçlar', title: 'İlana başvuranlar', comp: OpenApplicants },
]);
