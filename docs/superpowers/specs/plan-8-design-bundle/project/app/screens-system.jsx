/* global React, window, useApp, Icon, NavHeader, Button, Skel, EmptyState, BallMark, Avatar, LEVELS */
// ============================================================
// SYSTEM SCREENS + celebration/warning modals
// ============================================================

// ---------- generic empty ----------
function SysEmpty() {
  const { nav } = useApp();
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <NavHeader onBack={() => nav.back()} title="Empty State" />
    <EmptyState icon="search" title="Burada henüz bir şey yok" body="İçerik eklendiğinde bu alanda görünecek. Bu, uygulama genelinde kullanılan jenerik boş durum." action="Bir şeyler oluştur" onAction={() => nav.reset('new_match_type')} />
  </div>;
}

// ---------- error ----------
function SysError() {
  const { nav } = useApp();
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <NavHeader onBack={() => nav.back()} title="Error State" />
    <EmptyState tone="error" icon="warn" title="Bir şeyler ters gitti"
      body="İsteğini işlerken bir hata oluştu. Lütfen tekrar dene — sorun sürerse daha sonra tekrar gel."
      action="Tekrar dene" onAction={() => nav.toast('Yeniden deneniyor…')}
      extra={<code style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-num)' }}>error: NETWORK_TIMEOUT · 504</code>} />
  </div>;
}

// ---------- loading skeleton ----------
function SysLoading() {
  const { nav } = useApp();
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <NavHeader onBack={() => nav.back()} title="Loading Skeleton" />
    <div style={{ padding: '8px 18px' }}>
      <Skel w="45%" h={26} r={8} style={{ marginBottom: 6 }} />
      <Skel w="30%" h={14} r={6} />
    </div>
    <div style={{ display: 'flex', gap: 8, padding: '14px 18px' }}>{[0, 1, 2].map(i => <Skel key={i} w="33%" h={86} r={14} />)}</div>
    <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
          <Skel w={28} h={20} r={6} />
          <Skel w={44} h={44} r={22} />
          <div style={{ flex: 1 }}><Skel w="55%" h={14} r={6} style={{ marginBottom: 7 }} /><Skel w="35%" h={11} r={5} /></div>
          <Skel w={42} h={20} r={6} />
        </div>
      ))}
    </div>
  </div>;
}

// ---------- offline ----------
function SysOffline() {
  const { nav } = useApp();
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <NavHeader onBack={() => nav.back()} title="Offline" />
    <EmptyState tone="offline" icon="wifiOff" title="İnternet bağlantısı yok"
      body="Bağlantını kontrol et. Skorların kaydedildi ve çevrimiçi olunca otomatik senkronize edilecek."
      action="Tekrar dene" onAction={() => nav.toast('Bağlantı kontrol ediliyor…')}
      extra={<div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--warn-soft)', border: '1.5px solid var(--warn)', padding: '7px 13px', borderRadius: 'var(--r-pill)' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--warn)' }} /><span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--warn)' }}>2 maç senkron bekliyor</span>
      </div>} />
  </div>;
}

// ---------- force update ----------
function SysForceUpdate() {
  const { nav } = useApp();
  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 32px', gap: 8 }}>
    <BallMark size={72} />
    <div style={{ fontWeight: 800, fontSize: 23, letterSpacing: '-.02em', marginTop: 10 }}>Güncelleme gerekli</div>
    <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.5, maxWidth: 290 }}>Yeni bir sürüm yayınlandı. Devam etmek için Tennis Challenger’ı güncellemen gerekiyor.</p>
    <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '12px 16px', margin: '10px 0', fontSize: 12.5, color: 'var(--text-3)', fontFamily: 'var(--font-num)' }}>v1.0.0 → v1.2.0</div>
    <div style={{ width: '100%', marginTop: 'auto' }}><Button full size="lg" icon="download" onClick={() => nav.toast('App Store açılıyor…')}>Şimdi güncelle</Button></div>
  </div>;
}

// ---------- modal showcase wrapper ----------
function ModalScreen({ children }) {
  const { nav } = useApp();
  return (
    <div style={{ flex: 1, position: 'relative', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} close title="Modal" />
      <div style={{ position: 'absolute', inset: 0, top: 50, background: 'rgba(20,18,14,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {children}
      </div>
    </div>
  );
}

// ---------- badge celebration ----------
function ModalBadge() {
  const { nav } = useApp();
  return <ModalScreen>
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '32px 26px', textAlign: 'center', width: '100%', border: '1.5px solid var(--border-strong)', animation: 'popIn .3s cubic-bezier(.2,.9,.3,1.1)' }}>
      <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 18px' }}>
        <div style={{ position: 'relative', width: 96, height: 96, borderRadius: '50%', background: 'color-mix(in srgb,#5E8B39 14%,var(--surface))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--border-strong)' }}><Icon name="flame" size={44} color="#5E8B39" /></div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--clay)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Yeni Rozet!</div>
      <div style={{ fontWeight: 800, fontSize: 23, letterSpacing: '-.02em' }}>5 Maç Serisi</div>
      <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, margin: '8px 0 22px' }}>Üst üste 5 galibiyet aldın! Bu rozeti profil vitrinine ekleyebilirsin.</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="secondary" size="md" onClick={() => nav.back()} style={{ flex: 1 }}>Kapat</Button>
        <Button size="md" icon="star" onClick={() => { nav.toast('Vitrine eklendi'); nav.back(); }} style={{ flex: 1.3 }}>Vitrine ekle</Button>
      </div>
    </div>
  </ModalScreen>;
}

// ---------- level up ----------
function ModalLevelUp() {
  const { nav } = useApp();
  const lv = LEVELS.find(l => l.key === 'rekabet');
  return <ModalScreen>
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '32px 26px', textAlign: 'center', width: '100%', boxShadow: 'var(--shadow-pop)', animation: 'popIn .3s cubic-bezier(.2,.9,.3,1.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{ textAlign: 'center', opacity: .5 }}><Icon name="bolt" size={30} color="#2E63B8" /><div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', marginTop: 4 }}>Amatör</div></div>
        <Icon name="chevR" size={20} color="var(--text-3)" />
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'color-mix(in srgb,' + lv.color + ' 14%,var(--surface))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid color-mix(in srgb,' + lv.color + ' 35%,transparent)' }}><Icon name="bolt" size={32} color={lv.color} /></div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: lv.color, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Seviye Atladın!</div>
      <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-.02em' }}>{lv.name}</div>
      <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, margin: '8px 0 22px' }}>ELO’n <b className="num" style={{ color: 'var(--text)' }}>1400</b>’ü geçti. Artık Rekabetçi seviyesindesin — rozetin her yerde güncellendi.</p>
      <Button full size="lg" onClick={() => nav.back()}>Harika!</Button>
    </div>
  </ModalScreen>;
}

// ---------- score mismatch ----------
function ModalMismatch() {
  const { nav } = useApp();
  return <ModalScreen>
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '28px 24px', width: '100%', boxShadow: 'var(--shadow-pop)', animation: 'popIn .3s cubic-bezier(.2,.9,.3,1.1)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 18 }}>
        <div style={{ width: 60, height: 60, borderRadius: 'var(--r-lg)', background: 'var(--warn-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><Icon name="warn" size={30} color="var(--warn)" /></div>
        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-.01em' }}>Skorlar uyuşmuyor</div>
        <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5, margin: '8px 0 0' }}>Sen ve Berk farklı skor girdiniz. Doğru olanı seçin; anlaşamazsanız itiraz açılır.</p>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {[['Sen', '4-2', 'var(--clay)'], ['Berk', '4-3', 'var(--info)']].map(([who, sc, c]) => (
          <div key={who} style={{ flex: 1, textAlign: 'center', padding: '14px 8px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border)', background: 'var(--surface-2)' }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 700, marginBottom: 6 }}>{who}</div>
            <div className="num" style={{ fontWeight: 800, fontSize: 26, color: c }}>{sc}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Button full size="md" onClick={() => nav.back()}>4-2 doğru (benimki)</Button>
        <Button full size="md" variant="secondary" onClick={() => nav.back()}>4-3’ü kabul et</Button>
        <Button full size="sm" variant="danger" onClick={() => { nav.toast('İtiraz açıldı'); nav.back(); }}>Anlaşamadık · itiraz aç</Button>
      </div>
    </div>
  </ModalScreen>;
}

registerScreens([
  { id: 'sys_empty', group: 'Sistem', title: 'Empty state', comp: SysEmpty },
  { id: 'sys_error', group: 'Sistem', title: 'Error state', comp: SysError },
  { id: 'sys_loading', group: 'Sistem', title: 'Loading skeleton', comp: SysLoading },
  { id: 'sys_offline', group: 'Sistem', title: 'Offline', comp: SysOffline },
  { id: 'sys_forceupdate', group: 'Sistem', title: 'Force update', comp: SysForceUpdate },
  { id: 'modal_badge', group: 'Sistem', title: 'Modal · rozet kutlama', comp: ModalBadge },
  { id: 'modal_levelup', group: 'Sistem', title: 'Modal · seviye atlama', comp: ModalLevelUp },
  { id: 'modal_mismatch', group: 'Sistem', title: 'Modal · skor uyumsuzluğu', comp: ModalMismatch },
]);
