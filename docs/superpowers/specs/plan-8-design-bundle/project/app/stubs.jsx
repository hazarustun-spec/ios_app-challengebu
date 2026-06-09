/* global React, window, useApp, Icon, NavHeader, registerScreens */
// ============================================================
// Stub registry — guarantees every screen id is navigable.
// Real screen files load AFTER this and override the comp.
// ============================================================
function Stub({ title }) {
  const { nav } = useApp();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <NavHeader onBack={() => nav.back()} title={title} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-3)', padding: 30, textAlign: 'center' }}>
        <Icon name="spark" size={34} color="var(--text-3)" />
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-2)' }}>{title}</div>
        <div style={{ fontSize: 13 }}>Bu ekran yapım aşamasında.</div>
      </div>
    </div>
  );
}
const S = (id, group, title) => ({ id, group, title, comp: () => <Stub title={title} /> });

registerScreens([
  S('leaderboard', 'Sıralama', 'Sıralama'),
  S('lb_filter', 'Sıralama', 'Filtre paneli'),
  S('player_preview', 'Sıralama', 'Oyuncu önizleme'),

  S('matches_upcoming', 'Maçlar', 'Yaklaşan maçlar'),
  S('match_offers', 'Maçlar', 'Gelen teklifler'),
  S('open_feed', 'Maçlar', 'Açık ilan feed'),
  S('new_match_type', 'Maçlar', 'Yeni maç · tip'),
  S('new_match_path', 'Maçlar', 'Yeni maç · yol'),
  S('new_match_detail', 'Maçlar', 'Yeni maç · detay'),
  S('new_match_opponent', 'Maçlar', 'Yeni maç · rakip'),
  S('match_preview', 'Maçlar', 'Teklif önizleme'),
  S('format_rules', 'Maçlar', 'Format kuralları'),
  S('active_match', 'Maçlar', 'Aktif maç · skor'),
  S('match_summary', 'Maçlar', 'Maç sonu özeti'),
  S('dispute_form', 'Maçlar', 'İtiraz formu'),
  S('match_history', 'Maçlar', 'Geçmiş maçlar'),
  S('open_applicants', 'Maçlar', 'İlana başvuranlar'),

  S('profile', 'Profil & Gamification', 'Profil'),
  S('elo_history', 'Profil & Gamification', 'ELO geçmişi'),
  S('badges', 'Profil & Gamification', 'Rozetler'),
  S('stats', 'Profil & Gamification', 'İstatistikler'),
  S('settings', 'Profil & Gamification', 'Ayarlar'),
  S('notif_prefs', 'Profil & Gamification', 'Bildirim tercihleri'),
  S('delete_account', 'Profil & Gamification', 'Hesap silme'),

  S('season', 'Sezon & Turnuva', 'Aktif sezon'),
  S('bracket', 'Sezon & Turnuva', 'Finale bracket'),
  S('annual_champ', 'Sezon & Turnuva', 'Yıllık şampiyon'),
  S('season_archive', 'Sezon & Turnuva', 'Geçmiş sezonlar'),

  S('notifs', 'Bildirimler', 'Bildirim merkezi'),
  S('notifs_empty', 'Bildirimler', 'Bildirim · boş'),

  S('admin_home', 'Admin', 'Admin ana'),
  S('admin_disputes', 'Admin', 'Bekleyen itirazlar'),
  S('admin_seasons', 'Admin', 'Sezon yönetimi'),
  S('admin_bracket', 'Admin', 'Bracket düzenleme'),
  S('admin_users', 'Admin', 'Kullanıcı yönetimi'),
  S('admin_announce', 'Admin', 'Duyuru oluştur'),

  S('sys_empty', 'Sistem', 'Empty state'),
  S('sys_error', 'Sistem', 'Error state'),
  S('sys_loading', 'Sistem', 'Loading skeleton'),
  S('sys_offline', 'Sistem', 'Offline'),
  S('sys_forceupdate', 'Sistem', 'Force update'),
  S('modal_badge', 'Sistem', 'Modal · rozet kutlama'),
  S('modal_levelup', 'Sistem', 'Modal · seviye atlama'),
  S('modal_mismatch', 'Sistem', 'Modal · skor uyumsuzluğu'),
]);
