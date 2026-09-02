/* global React, window, useApp, Icon, NavHeader, Skel, EmptyState, Avatar, Button */
// ============================================================
// STATES — ekrana özel skeleton'lar · özel boş durumlar ·
// auth expired · pull-to-refresh. Düz dil + mevcut bileşenler.
// ============================================================

// ---------- skeleton: anasayfa ----------
function SkelHome() {
  const { nav } = useApp();
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <NavHeader onBack={() => nav.back()} title="Skeleton · Anasayfa" />
    <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Skel w={44} h={44} r={22} />
        <div style={{ flex: 1 }}><Skel w="50%" h={17} r={6} style={{ marginBottom: 7 }} /><Skel w="32%" h={12} r={5} /></div>
        <Skel w={38} h={38} r={19} />
      </div>
      <Skel w="100%" h={196} r={16} />
      <div style={{ display: 'flex', gap: 11 }}><Skel w="78%" h={56} r={28} /><Skel w={56} h={56} r={28} /></div>
      <Skel w="38%" h={15} r={6} />
      {[0, 1].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
          <Skel w={44} h={44} r={22} />
          <div style={{ flex: 1 }}><Skel w="60%" h={14} r={6} style={{ marginBottom: 7 }} /><Skel w="40%" h={11} r={5} /></div>
          <Skel w={20} h={20} r={10} />
        </div>
      ))}
    </div>
  </div>;
}

// ---------- skeleton: maçlar ----------
function SkelMatches() {
  const { nav } = useApp();
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <NavHeader onBack={() => nav.back()} title="Skeleton · Maçlar" />
    <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skel w="100%" h={44} r={12} />
      {[0, 1, 2].map(i => (
        <div key={i} style={{ padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Skel w={44} h={44} r={22} />
            <div style={{ flex: 1 }}><Skel w="55%" h={15} r={6} style={{ marginBottom: 7 }} /><Skel w="35%" h={11} r={5} /></div>
            <Skel w={64} h={24} r={12} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}><Skel w="30%" h={28} r={14} /><Skel w="30%" h={28} r={14} /><Skel w="24%" h={28} r={14} /></div>
        </div>
      ))}
    </div>
  </div>;
}

// ---------- skeleton: profil ----------
function SkelProfile() {
  const { nav } = useApp();
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <NavHeader onBack={() => nav.back()} title="Skeleton · Profil" />
    <div style={{ padding: '8px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Skel w={82} h={82} r={41} />
        <div style={{ flex: 1 }}>
          <Skel w="62%" h={19} r={7} style={{ marginBottom: 8 }} />
          <Skel w="40%" h={13} r={5} style={{ marginBottom: 8 }} />
          <Skel w="75%" h={6} r={3} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>{[0, 1].map(i => <Skel key={i} w="50%" h={108} r={16} />)}</div>
      <div style={{ display: 'flex', gap: 10 }}>{[0, 1, 2].map(i => <Skel key={i} w="33%" h={76} r={14} />)}</div>
      <Skel w="100%" h={52} r={12} />
      <Skel w="100%" h={52} r={12} />
    </div>
  </div>;
}

// ---------- empty: maç yok ----------
function EmptyMatches() {
  const { nav } = useApp();
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <NavHeader onBack={() => nav.back()} title="Boş · Maçlar" />
    <EmptyState icon="matches" title="Henüz maç yok"
      body="İlk maçını oluştur — rakibine meydan oku ya da açık ilan ver, kortta buluşun."
      action="Yeni maç oluştur" onAction={() => nav.go('new_match_type')} />
  </div>;
}

// ---------- empty: rozet yok ----------
function EmptyBadges() {
  const { nav } = useApp();
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <NavHeader onBack={() => nav.back()} title="Boş · Rozetler" />
    <EmptyState icon="medal" title="Henüz rozet yok"
      body="Maç oynadıkça rozetler kazanırsın. İlk galibiyet rozetin seni bekliyor."
      action="Maç ayarla" onAction={() => nav.go('new_match_type')} />
  </div>;
}

// ---------- auth expired ----------
function AuthExpired() {
  const { nav } = useApp();
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <NavHeader title="Oturum" />
    <EmptyState tone="error" icon="lock" title="Oturum süresi doldu"
      body="Güvenlik için yeniden giriş yapman gerekiyor. üniversite mailine yeni bir magic link gönderelim."
      action="Tekrar giriş yap" onAction={() => nav.reset('welcome')}
      extra={<code style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-num)' }}>auth: TOKEN_EXPIRED · 401</code>} />
  </div>;
}

// ---------- pull-to-refresh ----------
function PullRefresh() {
  const { nav } = useApp();
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <NavHeader onBack={() => nav.back()} title="Pull-to-refresh" />
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 0 14px' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid var(--surface-3)', borderTopColor: 'var(--lime)', animation: 'spinAround .9s linear infinite' }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>Yenileniyor…</span>
    </div>
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10, opacity: .55 }}>
      {[['Berk Aydın', 'Bugün 18:30 · Kort 1'], ['Mert Şahin', 'Yarın 12:00 · Kort 2'], ['Onur Çelik', 'Cuma 17:00 · Kort 1']].map(([n, w]) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: 'var(--surface)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-md)' }}>
          <Avatar name={n} round size={42} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{n}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>{w}</div>
          </div>
          <Icon name="chevR" size={18} color="var(--text-3)" />
        </div>
      ))}
    </div>
  </div>;
}

Object.assign(window, { SkelHome, SkelMatches, SkelProfile, EmptyMatches, EmptyBadges, AuthExpired, PullRefresh });
if (window.registerScreens) window.registerScreens([
  { id: 'skel_home', group: 'Sistem', title: 'Skeleton · Anasayfa', comp: SkelHome },
  { id: 'skel_matches', group: 'Sistem', title: 'Skeleton · Maçlar', comp: SkelMatches },
  { id: 'skel_profile', group: 'Sistem', title: 'Skeleton · Profil', comp: SkelProfile },
  { id: 'empty_matches', group: 'Sistem', title: 'Boş · Maçlar', comp: EmptyMatches },
  { id: 'empty_badges', group: 'Sistem', title: 'Boş · Rozetler', comp: EmptyBadges },
  { id: 'auth_expired', group: 'Sistem', title: 'Auth expired', comp: AuthExpired },
  { id: 'pull_refresh', group: 'Sistem', title: 'Pull-to-refresh', comp: PullRefresh },
]);
