/* global React, window, useApp, Icon, NavHeader, Avatar, Button, Chip, Segmented, Field, Sheet, ListRow, SectionLabel, LEADERBOARD, levelForElo */
// ============================================================
// ADMIN PANEL  (screens 49-54)
// ============================================================
const { useState: adS } = React;

function AdminBanner() {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: 'var(--text)', borderRadius: 'var(--r-pill)', margin: '0 18px 8px', alignSelf: 'flex-start' }}>
    <Icon name="shield" size={15} color="var(--bg)" /><span style={{ fontSize: 12, fontWeight: 800, color: 'var(--bg)' }}>ADMIN</span>
  </div>;
}

// ---------- 49: admin home ----------
function AdminHome() {
  const { nav } = useApp();
  const tiles = [
    ['admin_disputes', 'flag', 'Bekleyen İtirazlar', '3 bekliyor', 'var(--loss)'],
    ['admin_seasons', 'trophy', 'Sezon Yönetimi', 'Güz · aktif', 'var(--clay)'],
    ['admin_bracket', 'ranking', 'Bracket Düzenle', 'Top 8 seed', 'var(--info)'],
    ['admin_users', 'user', 'Kullanıcılar', '248 oyuncu', 'var(--grass)'],
    ['admin_announce', 'megaphone', 'Duyurular', '2 yayında', '#7A4FA0'],
    ['admin_system', 'settings', 'Sistem Sağlığı', '1 uyarı', 'var(--warn)'],
  ];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Admin Paneli" />
      <AdminBanner />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 18px 24px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {[['248', 'Oyuncu'], ['3', 'İtiraz'], ['41g', 'Sezon kaldı']].map(([v, l]) => (
            <div key={l} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 6px', textAlign: 'center' }}><div className="num" style={{ fontWeight: 800, fontSize: 22 }}>{v}</div><div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{l}</div></div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tiles.map(([id, ic, t, sub, c]) => (
            <button key={id} onClick={() => nav.go(id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb, ' + c + ' 13%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={21} color={c} /></div>
              <div style={{ flex: 1, textAlign: 'left' }}><div style={{ fontWeight: 700, fontSize: 15.5 }}>{t}</div><div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div></div>
              <Icon name="chevR" size={18} color="var(--text-3)" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- 50: disputes ----------
function AdminDisputes() {
  const { nav } = useApp();
  const disputes = [
    { a: 'Kaan Demir', b: 'Mert Şahin', aScore: '4-2', bScore: '4-3', reason: 'Skor yanlış girilmiş', format: 'BÜ Klasik', when: '2 saat önce', note: 'Son eli ben kazandım, 4-2 olmalı.' },
    { a: 'Emre Yıldız', b: 'Onur Çelik', aScore: '10-8', bScore: 'Oynanmadı', reason: 'Bu maç oynanmadı', format: 'Hızlı Tiebreak', when: '5 saat önce', note: 'Hiç sahaya çıkmadık.' },
  ];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Bekleyen İtirazlar" subtitle="2 itiraz karar bekliyor" />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {disputes.map((d, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--warn-soft)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12.5, color: 'var(--warn)' }}><Icon name="flag" size={14} color="var(--warn)" />{d.reason}</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>{d.when}</span>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 10 }}>{d.format}</div>
              {[[d.a, d.aScore, true], [d.b, d.bScore, false]].map(([name, score, isA]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0' }}>
                  <Avatar name={name} size={36} />
                  <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{name}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600 }}>girdiği skor</span>
                  <span className="num" style={{ fontWeight: 800, fontSize: 16, color: isA ? 'var(--clay)' : 'var(--info)', minWidth: 56, textAlign: 'right' }}>{score}</span>
                </div>
              ))}
              <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '10px 0 0', lineHeight: 1.45, background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>“{d.note}”</p>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px' }}>
              <Button variant="secondary" size="sm" onClick={() => nav.toast(d.b + ' lehine karar verildi')} style={{ flex: 1 }}>{d.b.split(' ')[0]} haklı</Button>
              <Button size="sm" onClick={() => nav.toast(d.a + ' lehine karar verildi')} style={{ flex: 1 }}>{d.a.split(' ')[0]} haklı</Button>
            </div>
            <button onClick={() => nav.toast('Maç geçersiz sayıldı')} style={{ width: '100%', padding: '11px', background: 'var(--surface-2)', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>Maçı geçersiz say (void)</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- 51: seasons ----------
function AdminSeasons() {
  const { nav } = useApp();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Sezon Yönetimi" />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 18px 24px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 18 }}>Güz Sezonu</span>
            <Chip color="var(--win)" bg="var(--grass-soft)">Aktif</Chip>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>1 Eyl – 15 Oca · Finale 16–25 Oca</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" icon="trophy" onClick={() => nav.go('admin_bracket')} style={{ flex: 1 }}>Finale başlat</Button>
            <Button variant="danger" size="sm" onClick={() => nav.toast('Sezon bitirme onayı gerekli')} style={{ flex: 1 }}>Sezonu bitir</Button>
          </div>
        </div>
        <div style={{ background: 'var(--clay-softer)', border: '1px solid var(--clay-soft)', borderRadius: 'var(--r-md)', padding: 14, marginBottom: 16, display: 'flex', gap: 10 }}>
          <Icon name="info" size={18} color="var(--clay)" />
          <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>Sezon bittiğinde soft reset uygulanır: <b className="num">yeni_elo = (önceki + 1200) / 2</b>. Tepeler düşer, dipler yükselir.</p>
        </div>
        <SectionLabel>Geçmiş sezonlar</SectionLabel>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <ListRow icon="crown" iconColor="#C9982E" title="Yaz 2025" subtitle="Şampiyon · Kaan Demir" chevron onClick={() => nav.go('bracket')} />
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <ListRow icon="crown" iconColor="#C9982E" title="Bahar 2025" subtitle="Şampiyon · Emre Yıldız" chevron onClick={() => nav.go('bracket')} />
        </div>
      </div>
    </div>
  );
}

// ---------- 52: bracket edit ----------
function AdminBracketEdit() {
  const { nav } = useApp();
  const seeds = LEADERBOARD.erkek_tek.slice(0, 8);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Bracket Düzenle" subtitle="Erkek Tek · Top 8 seed" action="Kaydet" onAction={() => { nav.toast('Bracket kaydedildi'); nav.back(); }} />
      <div className="scroll-y" style={{ flex: 1, padding: '8px 16px 24px' }}>
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 13, marginBottom: 14, display: 'flex', gap: 10 }}>
          <Icon name="info" size={18} color="var(--info)" />
          <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>Seed sırası sezon sonu ELO’ya göre otomatik. Sürükleyerek elle düzenleyebilirsin.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {seeds.map((p, i) => { const lv = levelForElo(p.elo); return (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <span className="num" style={{ width: 24, height: 24, borderRadius: 'var(--r-xs)', background: 'var(--clay-soft)', color: 'var(--clay-text)', fontWeight: 800, fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              <Avatar name={p.name} size={36} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div><div className="num" style={{ fontSize: 12, color: lv.color, fontWeight: 700 }}>{p.elo}</div></div>
              <Icon name="list" size={18} color="var(--text-3)" />
            </div>
          ); })}
        </div>
      </div>
    </div>
  );
}

// ---------- 53: users ----------
function AdminUsers() {
  const { nav } = useApp();
  const [q, setQ] = adS('');
  const users = LEADERBOARD.erkek_tek.concat(LEADERBOARD.kadin_tek).filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Kullanıcılar" subtitle="248 oyuncu" />
      <div style={{ padding: '4px 16px 8px' }}><Field icon="search" placeholder="Oyuncu ara…" value={q} onChange={setQ} /></div>
      <div className="scroll-y" style={{ flex: 1, padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {users.map((p, i) => (
            <div key={p.name + i} onClick={() => nav.sheet(<UserActions name={p.name} onClose={() => nav.closeSheet()} />)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
              <Avatar name={p.name} size={40} status={p.status} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{p.dept} · {p.wl[0] + p.wl[1]} maç</div></div>
              <Icon name="dots" size={18} color="var(--text-3)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function UserActions({ name, onClose }) {
  const { nav } = useApp();
  const act = (msg) => { onClose(); nav.toast(msg); };
  return (
    <Sheet onClose={onClose} title={name}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Avatar name={name} size={52} />
        <div><div style={{ fontWeight: 700, fontSize: 16 }}>{name}</div><div style={{ fontSize: 13, color: 'var(--text-3)' }}>Erkek Tek · 1655 ELO · aktif</div></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <ListRow icon="eye" title="Profili görüntüle" chevron onClick={() => act('Profil')} />
        <ListRow icon="shield" title="Admin yap" chevron onClick={() => act(name + ' admin yapıldı')} />
        <ListRow icon="clock" title="Askıya al (7 gün)" iconColor="var(--warn)" onClick={() => act(name + ' askıya alındı')} />
        <ListRow icon="ban" title="Banla" danger onClick={() => act(name + ' banlandı')} />
      </div>
    </Sheet>
  );
}

// ---------- 54: announcements ----------
function AdminAnnounce() {
  const { nav } = useApp();
  const [title, setTitle] = adS('');
  const [body, setBody] = adS('');
  const live = [['Bahar turnuvası kayıtları başladı 🎾', '2 Haz · 248 kişiye'], ['Kort 2 bakımda — 5 Haz kapalı', '30 May · 248 kişiye']];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title="Duyurular" />
      <div className="scroll-y" style={{ flex: 1, padding: '10px 18px 24px' }}>
        <SectionLabel>Yeni duyuru</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
          <Field placeholder="Başlık" value={title} onChange={setTitle} icon="megaphone" />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Duyuru metni…" rows={3} style={{ width: '100%', padding: 14, borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text)', resize: 'none', outline: 'none' }} />
          <Button full size="md" disabled={!title} icon="megaphone" onClick={() => { setTitle(''); setBody(''); nav.toast('Duyuru 248 oyuncuya gönderildi'); }}>Tüm topluluğa yayınla</Button>
        </div>
        <SectionLabel>Yayında</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {live.map(([t, m], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'color-mix(in srgb,#7A4FA0 13%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="megaphone" size={17} color="#7A4FA0" /></div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.35 }}>{t}</div><div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>{m}</div></div>
              <button onClick={() => nav.toast('Duyuru kaldırıldı')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><Icon name="trash" size={16} color="var(--text-3)" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

registerScreens([
  { id: 'admin_home', group: 'Admin', title: 'Admin ana', comp: AdminHome },
  { id: 'admin_disputes', group: 'Admin', title: 'Bekleyen itirazlar', comp: AdminDisputes },
  { id: 'admin_seasons', group: 'Admin', title: 'Sezon yönetimi', comp: AdminSeasons },
  { id: 'admin_bracket', group: 'Admin', title: 'Bracket düzenleme', comp: AdminBracketEdit },
  { id: 'admin_users', group: 'Admin', title: 'Kullanıcı yönetimi', comp: AdminUsers },
  { id: 'admin_announce', group: 'Admin', title: 'Duyuru oluştur', comp: AdminAnnounce },
]);
