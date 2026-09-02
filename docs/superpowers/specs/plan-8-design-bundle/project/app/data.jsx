/* global window */
// ============================================================
// Mock data — players, categories, matches, badges, courts, formats
// ============================================================

const CATEGORIES = [
  { key: 'erkek_tek',  label: 'Erkek Tek',  short: 'E-Tek',  group: 'tek' },
  { key: 'kadin_tek',  label: 'Kadın Tek',  short: 'K-Tek',  group: 'tek' },
  { key: 'open_tek',   label: 'Open Tek',   short: 'O-Tek',  group: 'tek' },
  { key: 'erkek_cift', label: 'Erkek Çift', short: 'E-Çift', group: 'cift' },
  { key: 'kadin_cift', label: 'Kadın Çift', short: 'K-Çift', group: 'cift' },
  { key: 'karma_cift', label: 'Karma Çift', short: 'Karma',  group: 'cift' },
  { key: 'open_cift',  label: 'Open Çift',  short: 'O-Çift', group: 'cift' },
];

const COURTS = ['Kort 1', 'Kort 2', 'Bebek Kort'];

const FORMATS = [
  { key: 'klasik',   name: 'Klasik',     tag: '4 El',     desc: '4 el, 15/30/40/avantaj. 3-3 olursa maç berabere (voided).', color: 'var(--ac-navy)',
    mult: '4-0 → 1.5×  ·  4-1 → 1.3×  ·  4-2 → 1.1×  ·  4-3 → 1.0×', mark: 'spark' },
  { key: 'tiebreak', name: 'Hızlı Tiebreak', tag: '10 Sayı',  desc: 'Tek tiebreak, 10 sayıya. Hızlı ve keskin.', color: 'var(--ac-blue)',
    mult: '10-0 → 1.5×  ·  10-5 → 1.2×  ·  10-8 → 1.0×', mark: 'bolt' },
  { key: 'proset',   name: 'Pro Set 8',     tag: '8 Oyun',   desc: '8 oyuna ilk ulaşan. 8-8 olursa tiebreak.', color: 'var(--ac-green)',
    mult: '8-0 → 1.5×  ·  8-4 → 1.2×  ·  9-8 tb → 1.0×', mark: 'shield' },
  { key: 'set3',     name: '3 Set Klasik',  tag: 'ATP',      desc: 'En iyi 2/3 set. Ciddi turnuva formatı. Final maçı.', color: 'var(--ac-purple)',
    mult: '2-0 set → 1.3×  ·  2-1 set → 1.0×', mark: 'trophy' },
];

const BADGES = [
  { key: 'first_win',  name: 'İlk Galibiyet',     icon: 'medal',   color: 'var(--ac-gold)', desc: 'İlk sıralama maçını kazan.' },
  { key: 'streak5',    name: '5 Maç Serisi',       icon: 'flame',   color: 'var(--ac-green)', desc: 'Üst üste 5 galibiyet.' },
  { key: 'giant',      name: 'Dev Avcısı',         icon: 'bolt',    color: 'var(--ac-navy)', desc: '150+ ELO üstü rakibi yen.' },
  { key: 'iron',       name: 'Demir İrade',        icon: 'shield',  color: 'var(--ac-blue)', desc: '3-3\'ten dönüp kazan.' },
  { key: 'season_top', name: 'Sezon Şampiyonu',    icon: 'crown',   color: 'var(--ac-gold)', desc: 'Sezon finalini kazan.' },
  { key: 'marathon',   name: 'Maraton',            icon: 'clock',   color: 'var(--ac-dgreen)', desc: '20+ oyunluk maç tamamla.' },
  { key: 'social',     name: 'Sosyal Kelebek',     icon: 'handshake',color: 'var(--ac-blue)', desc: '10 farklı rakiple oyna.' },
  { key: 'perfect',    name: 'Kusursuz',           icon: 'star',    color: 'var(--ac-gold)', desc: '4-0 / 10-0 / 8-0 kazan.' },
  { key: 'comeback',   name: 'Geri Dönüş',         icon: 'refresh', color: 'var(--ac-green)', desc: 'Hibernasyondan dönüp kazan.' },
];

// Avatar palette (navy/green, deterministic)
const AV_COLORS = [
  ['#DDE3F2','var(--ac-navy)'], ['#E2EDD2','#3E5C26'], ['#D6E0F4','#27408A'],
  ['#E9F1DC','var(--ac-dgreen)'], ['#DBE2F0','#2E3E8C'], ['#E4ECCF','#4E6B2C'],
];
function avatarFor(name) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [bg, fg] = AV_COLORS[h % AV_COLORS.length];
  const parts = name.split(' ');
  const initials = (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  return { bg, fg, initials };
}

const PRONOUNS = ['he/him', 'she/her', 'they/them'];

// Players (erkek_tek default leaderboard)
function mkPlayer(rank, name, elo, opts = {}) {
  return {
    rank, name, elo,
    pronoun: opts.pronoun || 'he/him',
    badges: opts.badges || [],
    status: opts.status || null,           // 'frozen'
    seasonChamp: opts.seasonChamp || false,
    annualChamp: opts.annualChamp || false,
    dept: opts.dept || 'Bilgisayar Müh.',
    year: opts.year || '3',
    wl: opts.wl || [12, 5],
    streak: opts.streak || 0,
    hand: opts.hand || 'Sağ',
  };
}

const LEADERBOARD = {
  erkek_tek: [
    mkPlayer(1, 'Kaan Demir', 1924, { badges: ['season_top','streak5','giant'], seasonChamp: true, annualChamp: true, wl: [28, 4], streak: 6, dept: 'Elektrik-Elektronik Müh.', year: '4' }),
    mkPlayer(2, 'Emre Yıldız', 1788, { badges: ['streak5','perfect'], wl: [22, 7], streak: 3, dept: 'Endüstri Müh.' }),
    mkPlayer(3, 'Berk Aydın', 1702, { badges: ['giant','iron'], wl: [19, 9], dept: 'Makine Müh.', year: '2' }),
    mkPlayer(4, 'Mert Şahin', 1655, { badges: ['marathon'], wl: [17, 11], dept: 'İşletme' }),
    mkPlayer(5, 'Can Öztürk', 1598, { badges: ['social'], status: 'frozen', wl: [15, 12], dept: 'Ekonomi', year: '4' }),
    mkPlayer(6, 'Deniz Arslan', 1540, { badges: ['first_win'], wl: [13, 12], dept: 'Fizik' }),
    mkPlayer(7, 'Ali Koç', 1487, { wl: [11, 13], dept: 'Matematik', year: '1' }),
    mkPlayer(8, 'Onur Çelik', 1432, { badges: ['comeback'], wl: [9, 14], dept: 'Tarih' }),
    mkPlayer(9, 'Burak Kaya', 1388, { wl: [7, 12], dept: 'Sosyoloji', year: '2' }),
    mkPlayer(10, 'Eren Doğan', 1320, { wl: [5, 11], dept: 'Felsefe', year: 'Hazırlık' }),
    mkPlayer(11, 'Tolga Aksoy', 1255, { wl: [4, 13], dept: 'Kimya' }),
    mkPlayer(12, 'Sinan Polat', 1190, { status: 'frozen', wl: [3, 10], dept: 'Psikoloji' }),
  ],
  kadin_tek: [
    mkPlayer(1, 'Zeynep Kaya', 1856, { pronoun: 'she/her', badges: ['season_top','perfect','giant'], seasonChamp: true, wl: [25, 5], streak: 4, dept: 'Moleküler Biyoloji', year: '4' }),
    mkPlayer(2, 'Elif Demir', 1744, { pronoun: 'she/her', badges: ['streak5'], wl: [20, 8], dept: 'Psikoloji' }),
    mkPlayer(3, 'Defne Yıldız', 1689, { pronoun: 'she/her', badges: ['iron','social'], wl: [18, 10], dept: 'Çeviribilim' }),
    mkPlayer(4, 'Naz Aydın', 1610, { pronoun: 'they/them', badges: ['marathon'], wl: [15, 11], dept: 'Siyaset Bilimi' }),
    mkPlayer(5, 'Su Arslan', 1552, { pronoun: 'she/her', wl: [13, 12], dept: 'İktisat' }),
    mkPlayer(6, 'Ada Çelik', 1498, { pronoun: 'she/her', badges: ['first_win'], status: 'frozen', wl: [10, 13], dept: 'Sosyoloji' }),
    mkPlayer(7, 'Lara Koç', 1440, { pronoun: 'she/her', wl: [8, 12], dept: 'Felsefe' }),
    mkPlayer(8, 'Ece Şahin', 1375, { pronoun: 'she/her', wl: [6, 11], dept: 'Matematik', year: '1' }),
  ],
  open_tek: [
    mkPlayer(1, 'Kaan Demir', 1924, { badges: ['season_top','giant'], seasonChamp: true, wl: [28, 4], dept: 'Elektrik-Elektronik Müh.' }),
    mkPlayer(2, 'Zeynep Kaya', 1856, { pronoun: 'she/her', badges: ['perfect'], wl: [25, 5], dept: 'Moleküler Biyoloji' }),
    mkPlayer(3, 'Emre Yıldız', 1788, { badges: ['streak5'], wl: [22, 7], dept: 'Endüstri Müh.' }),
    mkPlayer(4, 'Elif Demir', 1744, { pronoun: 'she/her', wl: [20, 8], dept: 'Psikoloji' }),
    mkPlayer(5, 'Berk Aydın', 1702, { badges: ['iron'], wl: [19, 9], dept: 'Makine Müh.' }),
    mkPlayer(6, 'Naz Aydın', 1610, { pronoun: 'they/them', wl: [15, 11], dept: 'Siyaset Bilimi' }),
  ],
};
['erkek_cift','kadin_cift','karma_cift','open_cift'].forEach(k => { LEADERBOARD[k] = []; });

// Current user
const ME = {
  name: 'Arda Yılmaz', pronoun: 'he/him', elo: 1612, rank: 4,
  dept: 'Bilgisayar Müh.', year: '3', hand: 'Sağ', level: 'orta',
  badges: ['streak5','giant','iron'], wl: [17, 9], streak: 3,
  matches: 26, longestStreak: 5,
};

const DEPARTMENTS = [
  'Bilgisayar Müh.','Elektrik-Elektronik Müh.','Endüstri Müh.','Makine Müh.','İnşaat Müh.',
  'Kimya Müh.','Çevre Müh.','İşletme','Ekonomi','İktisat','Uluslararası İlişkiler','Siyaset Bilimi',
  'Sosyoloji','Psikoloji','Felsefe','Tarih','Türk Dili ve Ed.','İngiliz Dili ve Ed.','Çeviribilim',
  'Dilbilim','Matematik','Fizik','Kimya','Moleküler Biyoloji','Bilgi ve Belge Yön.',
  'İlköğretim Mat. Öğr.','Yabancı Dil Eğitimi','Eğitim Bilimleri','Rehberlik','Bilgisayar Eğitimi',
  'Fizik Öğr.','Kimya Öğr.','Matematik Öğr.','Okul Öncesi Öğr.','Ekonomi ve Finans',
  'Yönetim Bilişim Sis.','Turizm İşletmeciliği',
];

// your rank per category you compete in (for chip badges)
const MY_CAT_RANKS = { erkek_tek: 4, open_tek: 7 };

// deterministic last-5 form (recent last), weighted by win rate
function formFor(p) {
  let h = 0; const key = (p && p.name) || String(p);
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const wl = (p && p.wl) || [12, 8];
  const wr = wl[0] / Math.max(1, wl[0] + wl[1]);
  const out = [];
  for (let i = 0; i < 5; i++) { h = (h * 1103515245 + 12345) >>> 0; out.push(((h >>> 16) & 255) / 255 < wr ? 'W' : 'L'); }
  return out;
}
// deterministic ELO trajectory of length n ending at current elo (for sparklines)
function eloTrend(p, n = 8) {
  let h = 0; const key = (p && p.name) || String(p);
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const elo = (p && p.elo) || 1500;
  const pts = []; let v = elo - 70;
  for (let i = 0; i < n; i++) { h = (h * 1103515245 + 12345) >>> 0; const step = (((h >>> 16) & 255) / 255 - 0.42) * 34; v += step; pts.push(Math.round(v)); }
  pts[n - 1] = elo;
  return pts;
}

Object.assign(window, {
  CATEGORIES, COURTS, FORMATS, BADGES, PRONOUNS, LEADERBOARD, ME, DEPARTMENTS, MY_CAT_RANKS,
  avatarFor, mkPlayer, formFor, eloTrend,
});
