// Legal document URLs — hosted on GitHub Pages.
// Consumed by sign-in consent row and settings screen.
const LEGAL_BASE =
  'https://hazarustun-spec.github.io/tennis-challenger-legal';

export const LEGAL_URLS = {
  privacy: `${LEGAL_BASE}/privacy.html`,
  kvkk: `${LEGAL_BASE}/kvkk.html`,
  terms: `${LEGAL_BASE}/terms.html`,
} as const;
