// Canonical availability windows — single source of truth.
//
// The UI uses short slot keys (`wd_am`, …); the DB column
// `profiles.availability_windows` stores the long values (`weekday_morning`, …).
// Onboarding writes the DB values via SLOT_TO_DB; the leaderboard filter holds
// slot keys and must translate them through the SAME map before comparing
// against a player's stored windows. Keeping both here prevents the two sides
// from drifting (which is exactly the bug this file fixes).

export const SLOT_TO_DB: Record<string, string> = {
  wd_am: 'weekday_morning',
  wd_noon: 'weekday_noon',
  wd_eve: 'weekday_evening',
  we_am: 'weekend_morning',
  we_noon: 'weekend_noon',
  we_eve: 'weekend_evening',
};

export const AVAILABILITY_SLOTS: Array<{ key: string; label: string }> = [
  { key: 'wd_am', label: 'Hafta içi sabah' },
  { key: 'wd_noon', label: 'Hafta içi öğlen' },
  { key: 'wd_eve', label: 'Hafta içi akşam' },
  { key: 'we_am', label: 'Hafta sonu sabah' },
  { key: 'we_noon', label: 'Hafta sonu öğlen' },
  { key: 'we_eve', label: 'Hafta sonu akşam' },
];
