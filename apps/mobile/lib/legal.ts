// Legal + support URLs — hosted at shimal.app/challengebu.
// Consumed by the sign-in consent row and the settings screen.
const LEGAL_BASE = 'https://shimal.app/challengebu';

export const LEGAL_URLS = {
  // Privacy + KVKK share one combined page.
  privacy: `${LEGAL_BASE}/gizlilik.html`,
  kvkk: `${LEGAL_BASE}/gizlilik.html`,
  terms: `${LEGAL_BASE}/kosullar.html`,
  support: `${LEGAL_BASE}/`,
} as const;
