# Plan 8: UI Redesign + App Store Release

**Tarih:** 2026-06-10
**Durum:** Spec (kullanıcı review bekliyor)
**Tasarım kaynağı:** `docs/superpowers/specs/plan-8-design-bundle/` — Claude Design handoff bundle (124 dosya, 5.7 MB)

---

## Goal

Plan 4-7 boyunca placeholder NativeWind primitive'leriyle yapılmış mobile UI'ı **tamamen** Claude Design bundle'ındaki ink/lime/court mavi tasarım dili ile yeniden yazıp App Store'a yayınlamak. UI redesign + 5 backend migration + 1 Supabase auth config (OTP) + 1 yeni Edge Function (deactivate-push-token) + EAS Build + TestFlight + App Store submission.

**Başarı kriterleri:**
1. 88 ekran tasarım dilinde, NativeWind 4 + Expo Router 4 üzerinde çalışır
2. 4 backend migration uygulanmış, mevcut testler yeşil + 12+ yeni deno test
3. Lighthouse-style mobile QA: tüm akışlar manuel iOS Simulator + EAS Preview build'de test edildi
4. KVKK + Privacy Policy + App Store metadata hazır
5. TestFlight'a build yüklendi, internal test grubu doğruladı
6. App Store Connect'te submission inceleme bekliyor

---

## Scope

### Dahil
- 88 ekran tam UI redesign (3 grup auth+onb + 1 home + 12 maç + 5 profil + 8 sezon/sıralama + 5 bildirim/ayar + 7 admin + 7 states + 3 share = 51 unique + variants)
- Design system foundation (3 font ailesi + token CSS → NativeWind theme.extend)
- Component library port (Button/Field/Sheet/Modal/Toast/Banner/TabBar/Avatar/EloChip/MatchCard/PlayerChip vs.)
- 5 backend migration:
  1. `match_kind` enum (ranking/friendly)
  2. `match_request_applications` tablosu
  3. `notification_category` revize (4 değer drop/add)
  4. `profiles.suspended_until` + `admin_reorder_bracket_seeds` RPC + `admin_cron_status` RPC
  5. `profiles.kvkk_accepted_at` timestamptz (consent kaydı)
- OTP backend support (Supabase auth.signInWithOtp `shouldCreateUser` config)
- 1 yeni Edge Function: `deactivate-push-token` (sign-out flow için)
- KVKK + Privacy Policy + Terms of Service (statik metin + email checkbox)
- Pre-TestFlight hardening: Plan 7 Faz H (manuel iOS QA) + push token cleanup on sign-out + Supabase Realtime tier review
- Share cards: maç sonucu + ELO progress + rozet kazanıldı (Instagram story 1080×1920, view-shot + expo-sharing)
- EAS Build setup (managed workflow)
- App Store Connect metadata + screenshots
- TestFlight internal test grubu yapılandırması

### Dahil değil
- Doubles bracket (sadece UI port; backend Plan 6 `season_doubles_teams` zaten var)
- Web/Android sürüm (sadece iOS)
- Dark mode (tasarım dili sadece light tema)
- Çok dilli destek (sadece Türkçe — `apps/mobile/i18n` mevcut, ileri sürümde EN eklenecek)
- Analytics / telemetry (PostHog/Sentry — v1.1'de eklenecek)
- In-app purchase / abonelik (free tier yeterli)
- Apple Watch / iPad layout (sadece iPhone)

---

## Architecture

### Mimari kararlar

**UI rewrite stratejisi:** Mevcut `apps/mobile/app/` route'ları korunur (Expo Router file-based routing), her ekranın içeriği tasarım diline göre yeniden yazılır. Hooks/queries/mutations dokunulmaz (Plan 1-7'de yazılan business logic stable). Component primitive'leri `apps/mobile/components/ui/` altında oluşturulur.

**Design system → NativeWind:** `styles/tokens.css` CSS değişkenleri → `tailwind.config.js` theme.extend. Custom plugin ile token mapping. Font'lar `expo-font` + Google Fonts (Bricolage Grotesque + Plus Jakarta Sans + Space Grotesk).

**Backend migrations:** Mevcut 32+ migration zinciri korunur. 4 yeni migration eklenir (Plan 8 numarası 20260610000001..0004). Plan 1'de kurulan `supabase db reset` idempotency korunur.

**Tab bar:** Expo Router `Tabs` + custom `tabBar` prop. 5 slot: Sıralama (= Anasayfa landing) · Maçlar · ➕ · Bildirim · Profil. "+" middle tab `tabPress` listener'ı default navigation'ı engelleyip `/new-match` modal'ına götürür.

**Frozen/Hibernating:** Backend `user_status` enum'da zaten var (`frozen_30/hibernating_60/inactive_90`), cron `update_user_status` günlük set ediyor. Mobile direk `status` field'ı okur, UI'da chip render.

**Score entry:** Basit one-side entry + opponent approval modeli korunur (Plan 4 backend). Design'ın "live sync" UI'ı KALDIRILACAK — pulse animation ve mismatch detection UI yok.

### Klasör yapısı (yeni eklenenler)

```
apps/mobile/
├── components/
│   ├── ui/                          # Yeni — design system primitives
│   │   ├── Button.tsx
│   │   ├── Field.tsx               # text + email + password + search
│   │   ├── SearchBar.tsx
│   │   ├── Segmented.tsx
│   │   ├── Toggle.tsx
│   │   ├── CheckBox.tsx            # shape: square|circle
│   │   ├── Card.tsx                # default + interactive (ListRow) + featured
│   │   ├── Modal.tsx
│   │   ├── Sheet.tsx               # bottom sheet
│   │   ├── Banner.tsx              # 4 tone (info/success/warning/error)
│   │   ├── Toast.tsx               # ink zemin, lime check, slideUp
│   │   ├── TabBar.tsx              # 5-slot lime pill
│   │   ├── Avatar.tsx              # initials fallback + status ring + badge
│   │   ├── EloChip.tsx             # ELO + delta chevron
│   │   ├── Sparkline.tsx           # ELO trend mini line
│   │   ├── FormDots.tsx            # W/L history dots
│   │   ├── LevelIcon.tsx
│   │   ├── FormatChip.tsx
│   │   ├── PlayerChip.tsx
│   │   ├── MatchCard.tsx           # planned/pending/done variants
│   │   ├── NavHeader.tsx           # standard + large + back/close/action
│   │   ├── Skel.tsx                # skeleton placeholder
│   │   ├── EmptyState.tsx          # icon + title + body + action + tone
│   │   └── doodles/                # SVG: BallMark, Cloud, Squiggle, Star, Dots
│   └── share/
│       ├── CardMatchResult.tsx     # 1080x1920 IG story
│       ├── CardEloProgress.tsx
│       ├── CardBadgeWon.tsx
│       └── ShareSheet.tsx          # capture + expo-sharing
├── theme/
│   ├── tokens.ts                   # design tokens export
│   ├── colors.ts
│   ├── typography.ts
│   └── motion.ts                   # 6 animation curves
└── lib/
    └── frozen-status.ts            # status enum → chip variant mapping

packages/supabase/migrations/
├── 20260610000001_match_kind_enum.sql
├── 20260610000002_match_request_applications.sql
├── 20260610000003_notification_category_revise.sql
└── 20260610000004_admin_extensions.sql   # suspended_until + 2 RPC
```

---

## Design System Foundation

### Renkler (token → hex)

**Yüzeyler & Ink:**
- `bg`, `surface` → `#FFFFFF`
- `surface-2` → `#F3F3F1` (warm gray)
- `surface-3` → `#E8E8E4` (skeleton, izleme)
- `border-strong` → `#1A1A1A` (1.5px ink hat)
- `text` → `#161618`
- `text-2` → `#65656E` (ikincil)
- `text-3` → `#A2A2AA` (soluk)

**Brand & Primary action:**
- `clay`, `clay-press` → `#161618` → `#000000` (ink pill CTA)
- `clay-soft` → `#EAF6D6`
- `clay-softer` → `#F3FAE7`
- `clay-text` → `#5C8C1E`

**Lime (hero):**
- `lime` → `#8FD43B`
- `lime-bright` → `#9BE048`
- `lime-deep` → `#5C8C1E`
- `lime-soft` → `#EAF6D6`
- `on-lime` → `#161618`

**Court mavi (rekabet):**
- `court` → `#2270BC`
- `court-2` → `#1A5694`
- `blue-soft` → `#DCE9F4`
- `frozen` → `#5E7CB4` (donmuş)
- `frozen-soft` → `#E6EDF7`

**Pink (seyrek vurgu):**
- `pink` → `#F73FBE`
- `pink-deep` → `#C81E92` (badge sayaç)
- `pink-soft` → `#FFE3F6`

**Semantik:**
- `win` → `#5C8C1E`
- `loss` → `#E0463C`
- `warn` → `#E0992B`
- `warn-soft` → `#FBEFD6`
- `info` → `court`
- `star` → `#F5B924`

**Seviyeler:**
- `lv-cekirge` → `#6F8B47`
- `lv-caylak` → `#5E8B39`
- `lv-amator` → `#2E63B8`
- `lv-rekabet` → `#2742A0`
- `lv-usta` → `#2A3A8E`
- `lv-elit` → `#2B357A`
- `lv-sampiyon` → `#B98A1E`

**Aksent (rozet/format):**
- `ac-gold` → `#B98A1E`
- `ac-green` → `#5E8B39`
- `ac-dgreen` → `#4C7330`
- `ac-navy` → `#2742A0`
- `ac-blue` → `#2E63B8`
- `ac-purple` → `#7A4FA0`

### Tipografi

**Font aileleri (Google Fonts):**
- `font-display` → Bricolage Grotesque (display, h1, h2 — büyük başlıklar)
- `font-sans` → Plus Jakarta Sans (body, h3, captions)
- `font-num` → Space Grotesk (numerals — ELO/skor/sayı, tnum on)

**Ölçek:**
| Token | Font | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|
| Display | Bricolage | 46 | 800 | 0.95 | -0.03em |
| H1 | Bricolage | 27 | 800 | 1.05 | -0.02em |
| H2 | Bricolage | 21 | 800 | 1.1 | -0.02em |
| H3 | Jakarta | 18 | 800 | 1.2 | -0.01em |
| Body LG | Jakarta | 15.5 | 700 | 1.4 | — |
| Body | Jakarta | 14 | 500 | 1.5 | — |
| Caption | Jakarta | 12.5 | 600 | 1.4 | — |
| Label | Jakarta | 11 | 800 | — | 0.1em + UPPERCASE |
| Numerals (.num) | Space Grotesk | inherit | 800 | — | -0.02em + tnum |

### Spacing scale (4-tabanlı)
- `sp-1` = 4 · `sp-2` = 8 · `sp-3` = 12 · `sp-4` = 16
- `sp-5` = 20 · `sp-6` = 24 · `sp-7` = 32 · `sp-8` = 40

### Border radius
- `r-xs` = 10 · `r-sm` = 14 · `r-md` = 18
- `r-lg` = 26 · `r-xl` = 34 · `r-pill` = 999

### Elevation
**SIFIR shadow.** Derinlik = 1.5px ink border + renk kontrastı + zemin değişimi. NativeWind/RN'de tüm shadow utility'ler boş.

### Motion (animation curves)
- `popIn` → `cubic-bezier(.2,.9,.3,1.1)` — modal, rozet (hafif overshoot)
- `slideUp` → `cubic-bezier(.2,.8,.2,1)` — bottom sheet, liste girişleri
- `scorePop` → scale 0.45 → 1.18 → 1 (her sayıda)
- `ball` → `cubic-bezier(.34,1.4,.5,1)` (canlı maç top efekti)
- `pulse / serveBlink` → 1.4s infinite (sync noktası)
- `pipFill` → scale 0 → 1.25 → 1 (oyun kazanılınca)

RN implementation: `react-native-reanimated` shared values + custom easing functions.

---

## Ekran Listesi (88 ekran, 11 grup)

### Grup 1 — Design System Foundation
Token export + theme/tokens.ts + NativeWind config + 3 font yüklenir (expo-font).

### Grup 2 — Component Library (15 primitive)
Button (6 variant + 4 state), Field, SearchBar, Segmented, Toggle, CheckBox, Card (3 variant), Modal, Sheet, Banner (4 tone), Toast, TabBar (5 slot), Avatar (3 size + badge), EloChip, FormatChip, PlayerChip, MatchCard (3 variant).

### Grup 3 — Auth & Onboarding (15 ekran)
1. splash — BallMark logo + 3 pulsing dots, 1.5s auto-replace welcome
2. welcome — Lime hero kart + doodle (Cloud/Squiggle/Star/Dots) + "Üniversite e-postanla başla"
3. email — Field big + BÜ regex inline validation + 3 quick-tap domain chip + **KVKK checkbox** (yeni)
4. otp — 6 box numerik input + 60s "Tekrar gönder" countdown + "Sihirli bağlantıyı kullandım" alt CTA
5. ob_name — Ad + Soyad
6. ob_phone — Telefon (opsiyonel, 🇹🇷 +90 suffix)
7. ob_pronoun — PickList (he/him, she/her, they/them, Diğer)
8. ob_category — Erkek/Kadın/Sadece Open
9. ob_dept — Sheet açan trigger + search + "Profilimde göster" toggle
10. ob_year — Pill chip grid (Hazırlık/1-4/YL/Doktora) + toggle
11. ob_level — Başlangıç/Orta/İleri (PickList ikonlu)
12. ob_hand — Sağ/Sol 2 kolon
13. ob_avail — 2×3 grid checkbox (hafta içi sabah/öğlen/akşam + hafta sonu)
14. ob_photo — 120 dashed kare uploader + "Atla" alt CTA
15. ob_done — Lime hero "Hoş geldin, X!" + stat strip (1200 ELO + Çaylak)

**Backend ekleme:**
- OTP support: Supabase `auth.signInWithOtp({ email, options: { shouldCreateUser: true, channel: 'email' } })` — magic link + 6-digit OTP iki yöntem
- KVKK consent column: `alter table public.profiles add column kvkk_accepted_at timestamptz not null default now();` (mevcut kullanıcılar için default now, yeni kayıtlarda email step'te checkbox işaretlenince set)

### Grup 4 — Anasayfa + Tabs (1 ekran + tab bar)
Anasayfa = Sıralama tab landing. Tab bar 5 slot (Sıralama · Maçlar · ➕ · Bildirim · Profil). "+" custom listener → `/new-match` modal.

GreetHeader + ELO Hero (court mavi 42px + Sparkline + level progress bar) + Yeni Maç row + Aktif maçlar + Son sonuçlar + Sezon banner.

### Grup 5 — Maçlar akışı (12 ekran)
1. matches_upcoming — Hub: 3 tab (Yaklaşan/Teklifler/İlanlar)
2. new_match_type — Sıralama (court mavi kart) vs Dostluk (pink-deep kart)
3. new_match_path — Direkt meydan oku vs Açık ilan
4. new_match_detail — 4 selector + Sheet'ler (Kategori/Format/Tarih/Saat/Kort)
5. new_match_opponent — Oyuncu listesi + search (singles veya partner+rakip)
6. match_preview — VS layout + ELO tahmini (+W/-L kartı)
7. format_rules — Kurallar + ELO çarpan + "okudum" checkbox (sıralama zorunlu)
8. active_match — Skor giriş (sayı butonları + el sayacı + Undo, **basit one-side**)
9. match_summary — Win/Lose/Voided pill + ELO CountUp animasyonu + Onayla/İtiraz
10. dispute_form — 4 sebep radio + textarea + gönder
11. match_history — Stat strip (W/L/oran) + maç listesi
12. open_applicants — Başvuranlar liste + her başvuranın notu + kabul/profile

**Backend eklemeler:**
- `alter type match_kind as enum ('ranking', 'friendly');`
- `alter table public.matches add column kind match_kind not null default 'ranking';`
- `alter table public.matches add column friendly_skip_elo boolean generated always as (kind = 'friendly') stored;` (helper)
- Friendly maçlar: ELO trigger `if new.kind = 'ranking'` ile guard
- `create table public.match_request_applications (id uuid pk, request_id uuid fk on delete cascade, applicant_id uuid fk profiles(user_id), note text, applied_at timestamptz default now(), unique(request_id, applicant_id));`
- RLS: applicant_id = auth.uid() insert; request creator + applicant select; admin update (accept = match_requests.target_id = applicant_id + status = 'accepted')

### Grup 6 — Profil (5 ekran)
1. profile — LevelRing avatar + pronoun chip + level progress + 3 vitrin + pill tab strip + Sıralamalar (renkli kart)
2. profile_edit — Avatar + camera FAB + form (zamir seg, bölüm field, sınıf + dominant el, seviye, müsaitlik)
3. elo_history — Kategori segmented + SVG line chart (tıklanabilir nokta + sezon başı dashed line) + stat strip
4. badges — 2-kolon grid (kazanılan/kilitli) + 3 vitrin pin + "Kaydet" CTA
5. stats — 2×2 büyük stat + W/L bar + Öne çıkanlar liste

**Backend uyumu:** ZERO yeni schema. `matches.rating_after_team_a/b` (ELO history), `user_badges.pinned_at` + `pin_badges(uuid[])` RPC (vitrin), `courts` tablosu hepsi mevcut.

### Grup 7 — Sıralama + Sezon + Turnuva (8 ekran)
1. leaderboard — Kategori chip + finale countdown hero + sticky "Sen" bar + Top-3 podium + rank rows (frozen ❄ + sparkline + form dots)
2. lb_filter — ELO range slider + müsaitlik grid + Donmuş/Hibernasyon toggle
3. player_preview — Avatar 92 ring + stat 2×2 + ELO + 3 rozet + frozen banner + "Meydan oku" CTA
4. season — Countdown hero (41 gün) + senin durumun + Finale Takvimi + Bracket linki
5. bracket — Top 8 singles bracket (QF/SF/F + kazanan court mavi crown kart)
6. bracket_doubles — Top 4 çiftler bracket (TeamSlot iki avatar + "İsim1 & İsim2")
7. annual_champ — Yıllık şampiyonluk + finale puanları (100/70/50/25) + #1 gold ring
8. season_archive — Geçmiş sezonlar + şampiyon + "Yıllık" chip

**Backend uyumu:** ZERO yeni schema. `tournaments` + `tournament_matches` + `season_doubles_teams` + `seasons` + `yearly_championship` + `finale-points.ts` hepsi mevcut.

**Frozen/Hibernating DÜZELTME (Grup 7 revisit):** Backend `user_status` enum'da zaten `frozen_30 / hibernating_60 / inactive_90` var ve cron job otomatik set ediyor. UI direkt `status` field okur:
- `status === 'frozen_30'` → ❄ Donmuş chip (frozen renk)
- `status === 'hibernating_60'` → Hibernasyondaki chip
- `status === 'inactive_90'` → İnaktif chip
- `status === 'active'` → normal görünüm
- Row opacity 0.72 if `status !== 'active'`

### Grup 8 — Bildirimler + Ayarlar (5 ekran)
1. notifs — Bildirim merkezi (Bugün/Dün/Daha önce gruplama + unread pink-deep nokta + 8 tip ikonu)
2. notifs_empty — EmptyState bell + "Maç oluştur" CTA
3. notif_prefs — 8 kategori toggle
4. settings — Bildirimler/Hesap/Diğer/Çıkış-Sil bölümleri + version footer
5. delete_account — 2-step (warning + "SİL" type-to-confirm)

**Backend eklemeler:**
```sql
-- 20260610000003_notification_category_revise.sql
-- Pre-launch oldugu için veri yok, enum modify safe
alter type notification_category drop value 'dispute_updates';
alter type notification_category drop value 'doubles_invitations';
alter type notification_category add value 'open_listings';
alter type notification_category add value 'match_reminders';
```

`packages/shared/src/notifications/categories.ts`:
- match_invitations · match_score_pending · badges_earned · season_lifecycle
- ladder_movement · community_announcements · open_listings · match_reminders

`DEFAULT_ON` map güncellenir, trigger güncellenir, mobile `useNotificationPreferences` 8 kategoriyle eşleşir.

**Sign-out push token cleanup (pre-TestFlight hardening #9):**
- Yeni Edge Function `deactivate-push-token` (delete by token)
- `handleLogout` çağrısı await + supabase.signOut() + token sil
- Memory'de pending olan kritik fix

### Grup 9 — Admin (7 ekran)
1. admin_home — Dashboard (ADMIN pill + 3 stat + 6 tile)
2. admin_disputes — Bekleyen itirazlar + "X haklı / Y haklı / Geçersiz say" 3 aksiyon
3. admin_seasons — Aktif sezon + Finale başlat / Sezonu bitir + soft reset formula
4. admin_bracket — Top 8 seed list (drag handle) + "Save"
5. admin_users — Arama + UserActions sheet (Profili gör / Admin yap / Askıya al / Banla)
6. admin_announce — Yeni duyuru form + yayında olan list (her biri trash)
7. admin_system — Cron işleri list + audit log feed + warning banner

**Backend eklemeler:**
```sql
-- 20260610000004_admin_extensions.sql

-- 1. Suspended timing (multi-duration)
alter table public.profiles add column suspended_until timestamptz;
-- Cron: daily check
create or replace function public.expire_suspensions() returns void
language sql security definer set search_path = public as $$
  update public.profiles
    set status = 'active', suspended_until = null
    where status = 'suspended' and suspended_until is not null and suspended_until < now();
$$;
select cron.schedule('expire_suspensions_daily', '0 3 * * *',
  $$select public.expire_suspensions();$$);

-- 2. Admin bracket seed reorder
create or replace function public.admin_reorder_bracket_seeds(
  tournament_id uuid,
  seed_player_ids uuid[]
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  -- Update tournament_matches first-round seeds in order
  -- ...impl details: match seed_player_ids[i] to position i
  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'reorder_bracket', 'tournament', tournament_id,
            jsonb_build_object('seeds', seed_player_ids));
end;
$$;
revoke all on function public.admin_reorder_bracket_seeds(uuid, uuid[]) from public;
grant execute on function public.admin_reorder_bracket_seeds(uuid, uuid[]) to authenticated;

-- 3. Admin cron status
create or replace function public.admin_cron_status(lim integer default 50)
returns table (
  jobname text, status text, start_time timestamptz, end_time timestamptz,
  return_message text
) language plpgsql security definer set search_path = cron, public as $$
begin
  if not public.is_admin() then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  return query
    select j.jobname, d.status, d.start_time, d.end_time, d.return_message
      from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid
      order by d.start_time desc
      limit least(greatest(lim, 1), 200);
end;
$$;
revoke all on function public.admin_cron_status(integer) from public;
grant execute on function public.admin_cron_status(integer) to authenticated;
```

**UI:** Admin paneli Plan 7'de yazılmıştı (Plan 7 Faz D-G). Plan 8'de UI sadece yeniden boyanır + 3 yeni feature (multi-duration suspend / drag-reorder / cron status) iliştirilir.

**Suspend süre seçimi UI:** UserActions sheet'te "Askıya al" → ikinci sheet açar (3 gün / 7 gün / 30 gün / sınırsız), seçim sonrası `admin-update-profile` Edge Function'a `status: 'suspended', suspended_until: ...` body gönderir. Server cron her gece 03:00'te expire_suspensions çağırır.

### Grup 10 — States (7 ekran)
3 skeleton (home/matches/profile) + 2 empty (matches/badges) + 1 error (auth_expired) + 1 pull-refresh demo.

`Skel` ve `EmptyState` primitive'leri `components/ui/` altında. Tüm ekranlara TanStack Query `isLoading` durumunda skeleton fallback eklenir.

### Grup 11 — Share Cards (3 IG story)
1. CardMatchResult — Court mavi + kort çizgileri + "KORT BENİM." + 280px skor + lime "+22 ELO" pill
2. CardEloProgress — White + 240px ELO + chart panel + 3 stat kartı + "GRAFİK YALAN SÖYLEMEZ"
3. CardBadgeWon — Lime zemin + 560px madalyon + "ROZET DÜŞTÜ"

**RN implementation:**
- `react-native-view-shot` (View → image capture, off-screen 1080×1920)
- `expo-sharing` (iOS native share sheet)
- `react-native-svg` (sparkline, BallMark, doodles)
- Share button erişim noktaları: match_summary, profile (ELO grafiği header), badges (kazanıldı modal)

---

## Backend Migration Sırası

```
20260610000001_match_kind_enum.sql
  - match_kind enum (ranking, friendly)
  - matches.kind kolonu + default 'ranking'
  - ELO trigger guard if kind = 'ranking'

20260610000002_match_request_applications.sql
  - match_request_applications tablosu
  - RLS policies (applicant insert, creator+applicant select, admin update)
  - Kabul edilince trigger: match_requests.target_id + status = 'accepted'

20260610000003_notification_category_revise.sql
  - dispute_updates + doubles_invitations DROP
  - open_listings + match_reminders ADD
  - DEFAULT_ON map güncel
  - shared/notifications/categories.ts güncel

20260610000004_admin_extensions.sql
  - profiles.suspended_until kolonu
  - expire_suspensions() function + daily cron (03:00)
  - admin_reorder_bracket_seeds(uuid, uuid[]) RPC
  - admin_cron_status(integer) RPC

20260610000005_kvkk_consent.sql
  - profiles.kvkk_accepted_at timestamptz default now()
  - Mevcut kullanıcılar için backfill (zaten default now)
```

**5 migration, hepsi pre-launch oldugu için veri kayıp riski yok.**

---

## Release Pipeline

### EAS Build setup
1. `eas.json` profile'ları:
   - `development` — Expo Dev Client (lokal Simulator + cihaz)
   - `preview` — internal share (TestFlight'a manuel push için)
   - `production` — App Store submission
2. iOS bundle identifier: `com.hazarustun.tenniskampus` (Apple Developer hesabı zaten var)
3. APNs key Supabase'a yüklenir (push notifications için)
4. EAS Build credentials: Apple Developer ile bağlanır

### App Store Connect
1. App kaydı oluşturulur (yeni app, Türkçe primary)
2. Metadata:
   - App adı: Tennis Challenger
   - Subtitle: BÜ tenis ladder + sezon
   - Description: 1000+ kelime Türkçe (BÜ topluluğu, ELO sistemi, sezon yapısı vurgular)
   - Keywords: tenis, boğaziçi, üniversite, ELO, ladder, sezon
   - Category: Sports primary, Social Networking secondary
   - Age rating: 4+
3. Screenshots:
   - iPhone 6.7" (15 Pro Max) — 6 screenshot (anasayfa, maç, profil, ladder, finale, share kart)
   - iPhone 6.5" (XS Max) — aynı 6 screenshot
   - iPhone 5.5" (8 Plus) — aynı 6 screenshot (legacy)
4. Privacy Policy URL: GitHub Pages veya custom domain
5. Support URL: GitHub repo veya email
6. KVKK metni: in-app + web mirror

### TestFlight
1. Internal testing grubu (kullanıcı + 2-3 davet)
2. Build push: `eas submit --platform ios --profile production --auto-submit`
3. TestFlight review: ~24h
4. Internal test → bug fix → external test (50 kişi) → App Store submission

### App Store Submission
1. "App Privacy" form: data collection (email, name, profile photo, match history) — clear opt-in
2. "App Review Information" — demo hesap (test@std.bogazici.edu.tr) + erişim talimatı
3. Sign-in with Apple? **Hayır** — magic link only (BÜ email gating zaten yapıyor)
4. Çevirmenli açıklamalar (Türkçe primary, İngilizce subtitle)
5. Submission → review (~3-5 gün)

---

## Pre-TestFlight Hardening Backlog

Memory `project_pre_testflight_hardening.md` 10 item; Plan 8'de bitmesi gereken pending'ler:

| # | Konu | Plan 8'de durum |
|---|---|---|
| 1 | profiles RLS column sızıntısı | ✅ ÇÖZÜLDÜ (Plan 5 + A#1) |
| 2 | Meydan Oku CTA boş forma | ⚠️ Plan 8 Grup 6 player_preview implementation'da düzeltilecek |
| 3 | expo-image-picker permission | ✅ ÇÖZÜLDÜ (A#6) |
| 4 | Migration konsolidasyonu | ✅ ÇÖZÜLDÜ (A#4) |
| 5 | Edge Function deno test'leri | ✅ ÇÖZÜLDÜ (A#5) |
| 6 | RadioGroup label zorunlu | ✅ ÇÖZÜLDÜ (Plan 5 polish) |
| 7 | Doubles bracket eksik takım modeli | ✅ ÇÖZÜLDÜ (Plan 6) |
| 8 | Sezon lifecycle otomasyonu | ⚠️ Plan 8'de pg_net + service-role JWT vault eklemeden devam (yarım kalan) |
| 9 | Sign-out push token cleanup | ⚠️ **Plan 8 Grup 8'de çözülecek** — yeni `deactivate-push-token` Edge Function + handleLogout flow |
| 10 | Supabase Realtime concurrent limit | ⚠️ Pro tier'a geçiş kararı Plan 8 release'de — şu an 5 kullanıcı için free yeterli, 300+ kullanıcı için Pro tier ($25/ay) |

---

## Test Stratejisi

### Yeni tests
- **Backend (deno):** 4 yeni migration için unit + integration test:
  - `match_kind` ELO trigger (friendly → ELO değişmez)
  - `match_request_applications` RLS (applicant insert + creator select + accept flow)
  - `notification_category` revize (eski enum drop + yeni cat'lere preference oluştur)
  - `suspended_until` cron expire + admin_reorder + admin_cron_status RPC
- **Mobile:** Existing 135+ unit test korunur. 30+ yeni component test:
  - Her primitive component (Button/Field/Sheet vs.) snapshot + interaction
  - EmptyState/Skel render
  - TabBar 5-slot navigation
  - Share card capture (mock view-shot)
- **E2E:** Detox veya Maestro ile en az 3 critical flow:
  1. Sign-in → onboarding → ilk maç oluştur → skor gir → onayla
  2. Ladder gez → oyuncu profili → meydan oku → maç önizleme → teklif gönder
  3. Bildirimler → maç sonucu paylaş (share card)

### Manuel iOS QA
- iOS Simulator (15 Pro, 15 Pro Max, SE 3rd) + en az 1 fiziksel cihaz
- 88 ekran ziyaret, golden path + edge case
- VoiceOver accessibility check (tüm CTA'lar reachable)
- Dynamic Type (large/extra-large + tablet)
- Network throttling (slow 3G, offline, reconnect)

---

## Out of Scope (v1.1+)

Bunlar Plan 8'e dahil değil, gelecek sürümlerde:
- Android sürüm (Expo zaten support ediyor, sadece EAS Android build + Play Store)
- Dark mode (tasarım dili sadece light)
- İngilizce dil desteği (i18n altyapısı mevcut, sadece çevirmen ekleme)
- Push notification deep-linking gelişmiş senaryolar (rich notifications + actions)
- Analytics (PostHog veya benzeri)
- Sentry / crash reporting
- In-app rating prompt (3 maç sonrası)
- Tournament admin UI (admin paneline bracket-creation wizard)
- Sıralama RPC (server-side filtering)
- ELO history aggregated table (şu an matches'ten compute)
- Live-sync skor giriş (mismatch detection + offline-first sync)

---

## Success Criteria

Plan 8 başarı kriterleri:

1. **Functional:** 88 ekran tasarım dilinde, NativeWind 4 + Expo Router 4'te çalışıyor. Plan 4-7 backend logic dokunulmadı, tüm akışlar (auth/maç/sezon/admin) çalışır durumda.

2. **Quality:** Tüm yeşil:
   - `bun run test` (mobile + shared + supabase)
   - `bun run typecheck` (TypeScript clean)
   - `bun run lint`
   - 17+ deno integration test (CI'da)
   - Manuel iOS Simulator QA 88 ekran ziyaret

3. **Backend:** 5 yeni migration (`match_kind`, `match_request_applications`, `notification_category`, `admin_extensions`, `kvkk_consent`) idempotent reset'te zero hata.

4. **Release infrastructure:**
   - `eas.json` 3 profile yapılandırıldı
   - APNs key Supabase'a bağlı
   - EAS Build successful preview build
   - TestFlight internal grup kuruldu, 1+ build başarıyla yayında

5. **App Store:**
   - Metadata Turkish hazır
   - Screenshots 3 iPhone size için (6 frame each)
   - Privacy Policy URL canlı
   - KVKK metni in-app + web mirror
   - Demo hesabı reviewer için hazır
   - Submission queue'da, review bekliyor

6. **Hardening:**
   - Sign-out push token cleanup çözüldü (deactivate-push-token Edge Function)
   - Meydan Oku CTA prefill düzeltildi (player_preview → opponentId)
   - Frozen/hibernating UI direkt backend status'tan okuyor (no client-side derive)

Plan 8 tamamlandığında: **Tennis Challenger TestFlight'ta** ve App Store reviewer kuyruğunda olacak.

---

## Notlar

- **Reference:** Tüm 88 ekran React prototype'ı `docs/superpowers/specs/plan-8-design-bundle/project/app/` altında. Implementation sırasında her ekran için ilgili `screens-*.jsx` dosyası direkt referans alınır.
- **Mikrocopy:** Tüm Türkçe metinler design'da hazır. Implementation sırasında copy-paste, "TBD" yok.
- **Doodles:** Cloud / Squiggle / Star / Dots / BallMark SVG'leri `doodles.jsx`'te. RN için `react-native-svg`'ye port edilir.
- **Plan 7 admin UI:** Plan 7 Faz D-G'de fonctional ama placeholder UI. Plan 8'de aynı hook/mutation'lar dokunulmadan UI yeniden boyanır.
- **Plan kapsamı büyük** ama 75%'i UI port (mekanik), 15% backend migration (4 migration), 10% release infra (EAS + App Store).
