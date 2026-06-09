/* global React, window, useApp, Icon, NavHeader, Avatar, Button, Sheet, EmptyState, BallMark */
// ============================================================
// NOTIFICATIONS  (screens 47-48) + push templates
// ============================================================
const { useState: nfS } = React;

const NOTIF_META = {
  offer:   { icon: 'bolt', color: 'var(--clay)' },
  confirm: { icon: 'check', color: 'var(--win)' },
  rank:    { icon: 'ranking', color: 'var(--info)' },
  badge:   { icon: 'flame', color: '#5E8B39' },
  season:  { icon: 'trophy', color: '#C9982E' },
  announce:{ icon: 'megaphone', color: '#7A4FA0' },
  listing: { icon: 'handshake', color: 'var(--grass)' },
  reminder:{ icon: 'clock', color: 'var(--warn)' },
};
const NOTIFS = {
  'Bugün': [
    { type: 'offer', who: 'Emre Yıldız', text: 'sana Sıralama Maçı için meydan okudu', time: '14:20', unread: true, go: 'match_offers' },
    { type: 'confirm', who: 'Berk Aydın', text: 'maç skorunu onayladı · +18 ELO', time: '11:05', unread: true, go: 'match_history' },
    { type: 'badge', text: '🔥 “5 Maç Serisi” rozetini kazandın!', time: '11:05', unread: true, go: 'badges' },
  ],
  'Dün': [
    { type: 'rank', text: 'Erkek Tek’te 5. sıradan 4. sıraya yükseldin', time: 'Dün 19:30', go: 'leaderboard' },
    { type: 'listing', who: 'Can Öztürk', text: 'senin müsaitliğine uygun bir ilan açtı', time: 'Dün 16:10', go: 'open_feed' },
    { type: 'reminder', text: 'Yarın 18:30 · Berk Aydın ile maçın var (Kort 1)', time: 'Dün 09:00', go: 'matches_upcoming' },
  ],
  'Daha önce': [
    { type: 'season', text: 'Finale window 41 gün sonra açılıyor. İlk 8’desin!', time: '4 Haz', go: 'season' },
    { type: 'announce', text: 'Topluluk: Bahar turnuvası kayıtları başladı 🎾', time: '2 Haz', go: null },
  ],
};

function Notifs() {
  const { nav } = useApp();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader large title="Bildirimler" actionIcon="check" onAction={() => nav.toast('Tümü okundu olarak işaretlendi')} />
      <div style={{ padding: '0 18px 8px' }}>
        <button onClick={() => nav.sheet(<PushTemplates onClose={() => nav.closeSheet()} />)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--surface-2)', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          <Icon name="eye" size={17} color="var(--text-2)" />
          <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Push bildirim şablonlarını gör (8 kategori)</span>
          <Icon name="chevR" size={16} color="var(--text-3)" />
        </button>
      </div>
      <div className="scroll-y" style={{ flex: 1, padding: '6px 16px 24px' }}>
        {Object.entries(NOTIFS).map(([day, items]) => (
          <div key={day} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', padding: '0 4px 8px' }}>{day}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((n, i) => { const m = NOTIF_META[n.type]; return (
                <div key={i} onClick={() => n.go ? nav.go(n.go) : nav.toast('Duyuru açıldı')} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 13px', background: n.unread ? 'var(--clay-softer)' : 'var(--surface)', border: `1px solid ${n.unread ? 'var(--clay-soft)' : 'var(--border)'}`, borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
                  {n.who ? <Avatar name={n.who} size={40} /> : <div style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', background: 'color-mix(in srgb, ' + m.color + ' 14%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={m.icon} size={20} color={m.color} /></div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, lineHeight: 1.45, margin: 0, color: 'var(--text)' }}>{n.who && <b>{n.who} </b>}{n.text}</p>
                    <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>{n.time}</span>
                  </div>
                  {n.unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pink-deep)', marginTop: 5, flexShrink: 0 }} />}
                </div>
              ); })}
            </div>
          </div>
        ))}
        <button onClick={() => nav.go('notifs_empty')} style={{ width: '100%', padding: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>Boş durumu gör →</button>
      </div>
    </div>
  );
}

function PushTemplates({ onClose }) {
  const items = [
    ['offer', 'Maç Teklifi', 'Emre Yıldız sana meydan okudu 🎾', 'Sıralama Maçı · BÜ Klasik · şimdi yanıtla'],
    ['confirm', 'Skor Onayı', 'Berk Aydın skoru onayladı', 'Erkek Tek · 4-1 · +18 ELO'],
    ['rank', 'Sıralama', '4. sıraya yükseldin! 📈', 'Erkek Tek · +1 basamak'],
    ['badge', 'Yeni Rozet', '🔥 5 Maç Serisi rozetini kazandın', 'Profilinde vitrine ekleyebilirsin'],
    ['season', 'Sezon Finali', 'Finale window açıldı', 'İlk 8’desin · bracket hazır'],
    ['announce', 'Duyuru', 'Bahar turnuvası kayıtları başladı', 'Topluluk duyurusu'],
    ['listing', 'Açık İlan', 'Sana uygun yeni bir ilan var', 'Can Öztürk · akşamları · Erkek Tek'],
    ['reminder', 'Hatırlatma', 'Yarın 18:30 maçın var', 'Berk Aydın · Kort 1'],
  ];
  return (
    <Sheet onClose={onClose} title="Push Bildirim Şablonları">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(([type, cat, title, body]) => { const m = NOTIF_META[type]; return (
          <div key={type}>
            <div style={{ fontSize: 11, fontWeight: 700, color: m.color, marginBottom: 5, marginLeft: 4 }}>{cat}</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '12px 13px', background: 'var(--surface-2)', borderRadius: 16, backdropFilter: 'blur(8px)', border: '1px solid var(--border)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={m.icon} size={20} color="#fff" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 800, fontSize: 13.5 }}>{title}</span><span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>şimdi</span></div>
                <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '2px 0 0', lineHeight: 1.4 }}>{body}</p>
              </div>
            </div>
          </div>
        ); })}
      </div>
    </Sheet>
  );
}

function NotifsEmpty() {
  const { nav } = useApp();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader large title="Bildirimler" />
      <EmptyState icon="bell" title="Henüz bildirim yok" body="Maç teklifleri, skor onayları, rozetler ve sezon güncellemeleri burada görünecek." action="Maç oluştur" onAction={() => nav.reset('new_match_type')} />
    </div>
  );
}

registerScreens([
  { id: 'notifs', group: 'Bildirimler', title: 'Bildirim merkezi', comp: Notifs, tab: 'notifs' },
  { id: 'notifs_empty', group: 'Bildirimler', title: 'Bildirim · boş', comp: NotifsEmpty, tab: 'notifs' },
]);
