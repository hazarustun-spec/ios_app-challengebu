/* global React, window, useApp, Icon, NavHeader, SectionLabel */
// ============================================================
// ADMIN · SİSTEM SAĞLIĞI — cron statusları + audit log feed
// ============================================================

function AdminSystem() {
  const { nav } = useApp();
  const crons = [
    { name: 'ELO yeniden hesaplama', last: '03:00 · bugün', ok: true },
    { name: 'Sezon gün sayacı', last: '00:05 · bugün', ok: true },
    { name: 'Donmuş oyuncu taraması', last: '02:30 · bugün', ok: true },
    { name: 'Bildirim kuyruğu', last: '12 dk önce', ok: true },
    { name: 'Mail magic-link servisi', last: '38 dk önce · timeout', ok: false },
  ];
  const audit = [
    { who: 'admin · Deniz A.', what: 'İtiraz #142 çözüldü — skor 4-2 onaylandı', when: '14:21' },
    { who: 'system', what: 'ELO yeniden hesaplandı · 248 oyuncu', when: '03:00' },
    { who: 'admin · Deniz A.', what: 'Duyuru yayınlandı: “Finale kayıtları açıldı”', when: 'dün 18:40' },
    { who: 'system', what: '3 oyuncu donduruldu (30+ gün inaktif)', when: 'dün 02:30' },
    { who: 'admin · Zeynep K.', what: 'Kullanıcı rolü değişti: Berk A. → moderatör', when: 'dün 11:05' },
  ];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Sistem Sağlığı" subtitle="Cron işleri + denetim kaydı" />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', background: 'var(--warn-soft)', border: '1.5px solid var(--warn)', borderRadius: 'var(--r-md)', marginBottom: 16 }}>
          <Icon name="warn" size={17} color="var(--warn)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--warn)' }}>1 servis uyarı veriyor</span>
        </div>

        <SectionLabel>Cron işleri</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 18 }}>
          {crons.map((c, i) => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.ok ? 'var(--grass)' : 'var(--warn)', border: '1.5px solid var(--border-strong)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}</div>
                <div className="num" style={{ fontSize: 11.5, color: c.ok ? 'var(--text-3)' : 'var(--warn)', fontWeight: 600, marginTop: 1 }}>{c.last}</div>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', color: c.ok ? 'var(--grass-text)' : 'var(--warn)', background: c.ok ? 'var(--grass-soft)' : 'var(--warn-soft)', padding: '3px 9px', borderRadius: 'var(--r-pill)' }}>{c.ok ? 'OK' : 'UYARI'}</span>
            </div>
          ))}
        </div>

        <SectionLabel>Denetim kaydı</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {audit.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 11, padding: '12px 14px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: a.who === 'system' ? 'var(--surface-2)' : 'var(--clay-softer)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={a.who === 'system' ? 'settings' : 'shield'} size={15} color={a.who === 'system' ? 'var(--text-3)' : 'var(--clay-text)'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{a.what}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>{a.who} · <span className="num">{a.when}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.AdminSystem = AdminSystem;
if (window.registerScreens) window.registerScreens([{ id: 'admin_system', group: 'Admin', title: 'Sistem sağlığı', comp: AdminSystem }]);
