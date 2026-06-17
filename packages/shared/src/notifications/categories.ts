// Plan 8 Task A3 — canonical notification category catalog.
//
// Mirrors the Postgres enum `public.notification_category` defined in
// migration 20260610000003_notification_category_revise.sql. Mobile UI
// (Bildirimler + Ayarlar, Grup 8) and Edge Functions both import from here
// so the wire types stay in sync with the DB.

export const NOTIFICATION_CATEGORIES = [
  'match_invitations',
  'match_score_pending',
  'badges_earned',
  'season_lifecycle',
  'ladder_movement',
  'community_announcements',
  'open_listings',
  'match_reminders',
  'message_received',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/**
 * Default `enabled` state seeded by the
 * `public.create_default_notification_preferences()` trigger when a profile
 * is created. Mobile uses this to render the toggle when no `notification_preferences`
 * row exists yet (e.g., during the first paint before the trigger row hits the cache).
 */
export const DEFAULT_ON: Record<NotificationCategory, boolean> = {
  match_invitations: true,
  match_score_pending: true,
  badges_earned: true,
  season_lifecycle: true,
  ladder_movement: true,
  community_announcements: true,
  open_listings: true,
  match_reminders: true,
  message_received: true,
};

export interface CategoryLabel {
  title: string;
  subtitle: string;
  /**
   * Icon token — Plan 8 design system uses these short names to look up the
   * matching SVG in the mobile icon set. Kept as plain strings here so the
   * shared package has no UI deps.
   */
  icon: string;
}

export const CATEGORY_LABELS: Record<NotificationCategory, CategoryLabel> = {
  match_invitations: {
    title: 'Maç teklifleri',
    subtitle: 'Sana gelen meydan okumalar',
    icon: 'bolt',
  },
  match_score_pending: {
    title: 'Maç onayları',
    subtitle: 'Skor onayı/itiraz',
    icon: 'check',
  },
  badges_earned: {
    title: 'Rozet kazanımı',
    subtitle: 'Yeni rozetler',
    icon: 'flame',
  },
  season_lifecycle: {
    title: 'Sezon & finaller',
    subtitle: 'Finale window, bracket',
    icon: 'trophy',
  },
  ladder_movement: {
    title: 'Sıralama değişimi',
    subtitle: 'Rank yükselişi/düşüşü',
    icon: 'ranking',
  },
  community_announcements: {
    title: 'Topluluk duyuruları',
    subtitle: 'Admin duyuruları',
    icon: 'megaphone',
  },
  open_listings: {
    title: 'Açık ilanlar',
    subtitle: 'Sana uygun yeni ilanlar',
    icon: 'handshake',
  },
  match_reminders: {
    title: 'Hatırlatmalar',
    subtitle: 'Yaklaşan maç hatırlatması',
    icon: 'clock',
  },
  message_received: {
    title: 'Mesajlar',
    subtitle: 'Yeni mesajlar',
    icon: 'chat',
  },
};
