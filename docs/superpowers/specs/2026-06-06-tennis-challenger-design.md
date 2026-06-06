# Tennis Challenger — Tasarım Belgesi

**Tarih:** 2026-06-06
**Proje:** Boğaziçi Üniversitesi Tenis Topluluğu Challenger Uygulaması
**Platform:** iOS öncelikli, Android takip (React Native + Expo)

---

## 1. Mimari ve Tech Stack

### Frontend (mobil)
- **React Native + Expo** (managed workflow)
- **Expo Router** — file-based routing
- **EAS Build + EAS Submit** — TestFlight + App Store + Google Play pipeline
- **NativeWind** — Tailwind CSS for React Native
- **TanStack Query** — server state / Supabase cache yönetimi
- **Zustand** — küçük client state
- **expo-notifications** — APNs + FCM push
- **react-hook-form + zod** — form validasyonu
- **bun** — paket yöneticisi ve test runner

### Backend
- **Supabase** Postgres + Auth + Realtime + Storage
- **Supabase Edge Functions (Deno)** — ELO hesaplama, sezon cron'ları, push gönderimi tetikleyicileri
- **Row Level Security (RLS)** — tüm tablolarda zorunlu
- **pg_cron** veya Supabase Scheduled Functions — cron job'lar

### Deploy & CI
- EAS Build (mobil), Supabase branching (staging + prod), GitHub Actions (typecheck/lint/test/preview build)

### Repo yapısı (monorepo, baştan kurulur)
```
tennis-challenger/
  apps/
    mobile/             # Expo app
    admin-web/          # Next.js — Faz 2 web admin dashboard
  packages/
    shared/             # Types, ELO logic, zod schemas
    supabase/           # Migrations, Edge Functions, seeds
  .github/workflows/
  docs/
```

Turborepo veya pnpm workspaces. Faz 2 web admin dashboard için baştan monorepo kurulumu — sonradan ayırmak zahmetli.

### UI tasarımı
Kullanıcı tarafından sağlanacak Claude Design link'i takip edilecek. Implementation plan'da UI fazı, design link teslim edildikten sonra başlar. O zamana kadar veri modeli + backend + maç mantığı önce yapılır, ekranlar design'a göre sonra giydirilir.

---

## 2. Veri Modeli

Tüm tablolarda standart: `id uuid primary key`, `created_at timestamptz default now()`, RLS aktif.

### Çekirdek tablolar

**`profiles`** — `auth.users`'a 1:1
- `user_id` (FK), `role` (`'player' | 'admin'`)
- `first_name`, `last_name`, `email`, `phone` (nullable, sadece eşleşilen oyunculara görünür)
- `pronoun` (`'he/him' | 'she/her' | 'they/them' | 'other'` + opsiyonel custom text)
- `gender_category` (`'erkek' | 'kadin' | 'open_only'`) — yarışma kategori uygunluğu
- `department` (FK departments), `class_year` (`'hazirlik' | '1' | '2' | '3' | '4' | 'yl' | 'doktora'`)
- `show_department boolean default true`
- `show_class_year boolean default true`
- `skill_self_assessment` (`'baslangic' | 'orta' | 'ileri'`) — cosmetic, eşleşme önerisi için
- `dominant_hand` (`'sag' | 'sol'`)
- `availability_windows text[]` — `["weekday_morning", "weekday_noon", "weekday_evening", "weekend_morning", "weekend_noon", "weekend_evening"]`
- `avatar_url` (Supabase Storage)
- `status` (`'active' | 'frozen_30' | 'hibernating_60' | 'inactive_90' | 'anonymized'`)
- `last_match_at timestamptz`
- `pinned_badge_ids uuid[]` (max 3, app-level enforcement)

**`elo_ratings`** — Oyuncu × kategori
- `profile_id`, `category` (`'erkek_tek' | 'kadin_tek' | 'open_tek' | 'erkek_cift' | 'kadin_cift' | 'karma_cift' | 'open_cift'`)
- `rating int default 1200`
- `matches_played int default 0` (K-factor için)
- Unique index `(profile_id, category)`

**`courts`** — Seed: `Kort 1`, `Kort 2`, `Bebek Kort`
- `name`, `display_order`

**`departments`** — BÜ bölümleri sabit liste (~80 satır, seed migration)

### Maç akışı

**`match_requests`**
- `creator_id`, `type` (`'direct_challenge' | 'open_call'`)
- `target_id` (direct ise zorunlu, open ise null)
- `category`, `format` (`'bu_klasik' | 'hizli_tiebreak' | 'pro_set_8' | '3set_klasik'`)
- `is_rated boolean` — false = Dostluk Maçı
- `proposed_date`, `proposed_time`, `court_id`
- `creator_partner_id`, `target_partner_id` (nullable, doubles için)
- `status` (`'pending' | 'accepted' | 'rejected' | 'expired' | 'completed'`)
- `expires_at` — creation + 24 saat

**`open_call_applications`**
- `match_request_id`, `applicant_id`, `applicant_partner_id` (doubles için), `status` (`'pending' | 'selected' | 'declined'`)

**`matches`**
- `match_request_id` (FK)
- `category`, `format`, `court_id`, `played_at`
- `is_rated boolean`
- `team_a_player_ids uuid[]`, `team_b_player_ids uuid[]`
- `score_team_a`, `score_team_b` — el/set kazanılan sayısı
- `score_details jsonb` — el bazında detay, örn. BÜ Klasik için `[{"el": 1, "winner": "a"}, ...]`, 3 Set Klasik için `[{"set": 1, "a": 6, "b": 4}, ...]`
- `winner_team` (`'a' | 'b' | 'void'`)
- `status` (`'awaiting_confirmation' | 'confirmed' | 'disputed' | 'voided'`)
- `confirmed_by uuid[]`, `confirmed_at`, `voided_reason text`
- `rating_before_team_a int`, `rating_after_team_a int`
- `rating_before_team_b int`, `rating_after_team_b int` (Dostluk maçında null)

**`match_score_submissions`**
- `match_id`, `submitted_by`, `score_details jsonb`, `submitted_at`
- Her oyuncunun girdiği skorlar kayda alınır; en son iki submission karşılaştırılarak uyumsuzluk tespit edilir

**`disputes`**
- `match_id`, `raised_by`, `reason text`
- `status` (`'open' | 'resolved'`)
- `resolution_notes`, `resolved_by`, `resolved_at`

### Sezon ve turnuva

**`seasons`**
- `name` (`'Güz' | 'Bahar' | 'Yaz'`), `year`, `starts_at`, `ends_at`
- `finale_starts_at`, `finale_ends_at` (sezonun son 10 günü)
- `status` (`'upcoming' | 'active' | 'finale' | 'closed'`)

**`season_standings`** — Sezon sonu snapshot
- `season_id`, `profile_id`, `category`, `final_rating`, `rank`, `matches_played`

**`tournaments`** — Sezon finali bracket'leri
- `season_id`, `category`, `bracket_size` (8 tek için, 4 çift için)
- `status` (`'seeded' | 'in_progress' | 'completed'`)

**`tournament_matches`**
- `tournament_id`, `round` (1=ilk tur, 2=yarı, 3=final)
- `match_id` (FK matches), `bracket_position int`
- `seed_a int`, `seed_b int`

**`yearly_championship`**
- `year`, `category`, `profile_id`
- `total_finale_points int`, `rank int`

### Gamification

**`badges`** (seed data)
- `code` (örn. `'milestone_10_matches'`), `name_tr`, `description_tr`, `icon`
- `category` (`'milestone' | 'win' | 'social' | 'season' | 'fun' | 'loyalty' | 'yearly'`)
- `is_seasonal boolean` (sezon sonu sıfırlanır mı)

**`user_badges`**
- `profile_id`, `badge_id`, `earned_at`, `season_id` (seasonal ise)

### Bildirim

**`notifications`**
- `recipient_id`, `category` (8 kategori — aşağıda Bölüm 7'de), `title`, `body`
- `data jsonb` (örn. `{"match_request_id": "..."}`)
- `read_at`, `push_sent_at`

**`push_tokens`**
- `profile_id`, `token text`, `platform` (`'ios' | 'android'`), `last_active_at`

**`notification_preferences`** — Oyuncunun her kategori için aç/kapa tercihi
- `profile_id`, `category`, `enabled boolean`

### Operasyonel

**`audit_log`**
- `actor_id`, `action`, `entity_type`, `entity_id`, `details jsonb`

**`announcements`** — Topluluk duyuruları
- `created_by` (admin), `title`, `body`, `target_filter jsonb`, `published_at`, `dismissed_count`

**Toplam: 19 tablo.**

---

## 3. Kullanıcı Akışı

### 3.1 Kayıt
- Email validasyonu: regex `@boun\.edu\.tr$` veya `@std\.bogazici\.edu\.tr$`
- Admin maili: BÜ domain zorunluluğundan istisna (beyaz liste mekanizması, ilk admin DB'de manuel atanır)
- Magic link / 6-haneli OTP (Supabase Auth email provider)

### 3.2 Onboarding (zorunlu, sıralı)

1. Ad
2. Soyad
3. Telefon (opsiyonel) — gizlilik notu ile birlikte
4. Pronoun (he/him, she/her, they/them, other)
5. Yarışma kategorisi (Erkek / Kadın / Sadece Open)
6. Bölüm (BÜ dropdown'undan seçim) → **Profilde göster?** toggle (varsayılan açık)
7. Sınıf (Hazırlık / 1 / 2 / 3 / 4 / YL / Doktora) → **Profilde göster?** toggle
8. Tenis seviyesi (Başlangıç / Orta / İleri) — ELO'ya etki etmez
9. Dominant el (Sağ / Sol)
10. Müsaitlik (6 zaman dilimi checkbox)
11. Profil fotoğrafı (opsiyonel, atla butonu)

Tamamlanınca: tüm uygun kategorilerde `elo_ratings` 1200 ile seed edilir, ana ekrana yönlendirilir.

### 3.3 Yarışma kategorisi kuralları

- **Erkek** seçen → erkek kategorileri + open kategorileri (kadın kapalı)
- **Kadın** seçen → kadın kategorileri + open kategorileri (erkek kapalı)
- **Sadece Open** seçen → sadece open kategorileri

Karma çift'te erkek + kadın kombinasyonu gerekir.

### 3.4 Kategori değiştirme
- Sadece **sezonun Finale window'unda** (son 10 gün) aktif
- Sezon aktifken disabled, "Sonraki değişim penceresi: <tarih>" tooltip
- Değişim kalıcı; eski kategori ELO arşivde tutulur, yeni kategoride 1200'den başlar

### 3.5 Pasiflik kuralları (cron: günlük 03:00 TR)

`status` otomatik güncellenir:
- `last_match_at < now() - 30 days` → `frozen_30` (❄️ ikon, ladder'da görünür)
- `last_match_at < now() - 60 days` → `hibernating_60` (varsayılan gizli, filtre ile görünür)
- `last_match_at < now() - 90 days` → `inactive_90` (sezon finali sıralamasından düşer)

Bir maç oynanırsa `last_match_at` güncellenir, status atomik olarak `active`'e döner.

### 3.6 Hesap silme (anonimleştirme)

Profil → Ayarlar → Hesabımı Sil → 2 onay ekranı.

Edge Function (atomik):
1. `profiles`: ad/soyad → "Eski Üye", email/phone/avatar/pinned_badge_ids → null
2. `status` → `'anonymized'`
3. `auth.users` satırı silinir
4. `push_tokens` silinir
5. Audit log'a yazılır

Maç geçmişi korunur (ELO bütünlüğü). Admin ise: önce başka birine admin atanması zorunlu (UI uyarısı).

---

## 4. Maç Sistemi

### 4.1 Maç oluşturma

Üst seviye iki toggle:
- **🏆 Sıralama Maçı** (rated) — ELO'yu etkiler
- **🤝 Dostluk Maçı** (unrated) — ELO etkilemez

Her ikisinde de aynı 4 format seçilebilir:
- **BÜ Klasik** (default) — ~60 dk, 4 el alan kazanır, 15/30/40/avantaj, 3-3'te Maçı Bitir → voided
- **Hızlı Tiebreak** — ~20 dk, sadece 10 sayılık match tiebreak
- **Pro Set 8** — ~75 dk, ilk 8 game alan, 6-6'da tiebreak
- **3 Set Klasik** — ~2 saat, ATP standardı

### 4.2 Maç başlatma yolları

**Direkt meydan okuma:**
1. Kategori → rakip seç (uygun + aktif filtresi)
2. Tarih + saat + kort + format
3. Çift ise: kendi partneri + rakip çift seç
4. `match_request` (`status='pending'`, `expires_at=now()+24h`) → rakibe push

**Açık ilan:**
1. Kategori + tarih + saat + kort + format
2. `match_request` (`type='open_call'`, `target_id=null`)
3. Uygun oyuncuların feed'inde görünür (push gönderilmez)
4. Başvurular `open_call_applications`'a düşer
5. İlan sahibi birini seçer → seçilene push, kapanır

### 4.3 Limitler

- Atılan açık teklif (direct + open call) max **3**
- Alınan teklifte limit yok
- Aynı kişiyle aynı kategoride sıklık limiti **yok**
- Süre dolanlar otomatik `expired`, atılan sayacı azalır
- **Dostluk maçları 3 limitten muaf** (sosyallik için bariyer kalkar)

### 4.4 Maç günü ve skor girişi

- Maç saati: her iki tarafa hatırlatma push
- "Maça Başla" → format kuralları modal'ı (zorunlu okuma)
- Skor giriş ekranı: her el sonunda iki oyuncu da kendi telefonunda girer
- Realtime sync: A girer → B'nin ekranında "tekrar gir" → eşleşirse onay
- Uyumsuzlukta banner: *"Uyumsuz skor: iki kullanıcı farklı skor girdi, devam edebilmeniz için aynı skor girmelisiniz. Lütfen tekrar girin."*
- Aynı skor girilene kadar sonraki ele geçilemez (deneme limiti yok)
- 3-3'te BÜ Klasik: "Maçı Bitir" iki taraftan da onaylanırsa `voided`, ELO etkilenmez

### 4.5 Maç sonu onayı

- Kazanan belli olduğunda her iki tarafa "Maç Sonu" ekranı: özet + tahmini ELO değişimi
- "Onayla" / "İtiraz Et" butonları
- Her iki taraf "Onayla" → `status='confirmed'`, ELO uygulanır
- Birisi "İtiraz Et" → `status='disputed'`, admin'e bildirim
- 48 saatte onaylanmazsa: cron otomatik onaylar (`auto_confirm_matches`)

### 4.6 ELO hesaplama

Standart ELO + margin multiplier:

```
expected_a = 1 / (1 + 10^((rating_b - rating_a) / 400))
new_rating_a = rating_a + K * (score_a - expected_a) * margin_multiplier
```

**K-factor:**
- `matches_played < 10` → K = 40 (hızlı kalibrasyon)
- `matches_played >= 10` → K = 20

**Margin multiplier (skor farkı):**
| Format | Multiplier ölçeği |
|---|---|
| BÜ Klasik | 4-0 → 1.5×, 4-1 → 1.3×, 4-2 → 1.1×, 4-3 → 1.0× |
| Hızlı Tiebreak | 10-0 → 1.5×, 10-5 → 1.2×, 10-8 → 1.0× |
| Pro Set 8 | 8-0 → 1.5×, 8-4 → 1.2×, 8-7/tiebreak → 1.0× |
| 3 Set Klasik | 2-0 set → 1.3×, 2-1 set → 1.0× |

**Çift maçları:**
- Takım ELO ortalaması üzerinden hesap
- Her iki bireysel ELO eşit oranda güncellenir
- Her oyuncunun ayrı bir "çift kategorisi ELO'su" var (tek ELO'sundan bağımsız)

**Implementation:** `packages/shared/elo.ts` — hem mobil hem web admin dashboard kullanır. Asıl hesap server-side (Edge Function), frontend sadece preview gösterir.

### 4.7 İtiraz akışı

- `disputes` kaydı açılır, admin'e bildirim
- Admin paneli: maç detayı + her iki tarafın girdiği skorlar + yorum
- Admin aksiyonları: A lehine onayla / B lehine onayla / Voided / Tekrar oynat
- Admin kendi maçındaki itirazda **otomatik karşı taraf lehine** (sistem kuralı, çıkar çatışması engeli)

---

## 5. Sezon ve Turnuva Mekaniği

### 5.1 Takvim (akademik yıl bazlı, boşluksuz)

| Sezon | Aktif Ladder | Finale (son 10 gün) |
|---|---|---|
| **Güz** | 1 Eylül - 15 Ocak | 16-25 Ocak |
| **Bahar** | 26 Ocak - 20 Haziran | 21-30 Haziran |
| **Yaz** | 1 Temmuz - 20 Ağustos | 21-31 Ağustos |

Sezonlar arası boşluk yoktur — bir sezonun finale window'u biter bitmez sonraki sezon başlar.

**Finale window kuralları:**
- Yeni ladder maçı başlatılamaz, mevcut maçlar bitebilir
- Finale bracket maçları bu pencerede oynanır
- Kategori değişim penceresi (finale'e girmemiş oyuncu için)

### 5.2 Sezon başında soft reset

```
new_elo = (last_season_final_elo + 1200) / 2
```

- 1500 ile bitirdiysen → 1350 ile başlarsın
- 900 ile bitirdiysen → 1050 ile başlarsın
- Yeni katılan oyuncu → 1200 (zaten)
- Tepe düşer, dip yükselir, süreklilik korunur

### 5.3 Sezon Finali Turnuva

**Seeding:**
- Sezon bitince `season_standings` snapshot alınır
- Top 8 (tek) / Top 4 (çift) belirlenir
- Bracket seed: 1v8, 4v5, 3v6, 2v7 (tek); 1v4, 2v3 (çift)

**Maç formatı:**
- Çeyrek + yarı: BÜ Klasik
- Final: 3 Set Klasik

**Akış:**
- Admin "Sezon Finali Başlat" → bracket otomatik oluşturulur
- Maçlar `matches` + `tournament_matches`'e bağlanır
- Oyuncular kendileri ayarlar (10 gün içinde)
- Bir tur tamamlanmadan sonraki tur eşleşmesi gözükmez

**Çekilen oyuncu:** Admin paneli'nden yedek (9., 10. sıradakiler) yukarı çıkarılır.

### 5.4 Sezon Finali puanları (Yıllık Şampiyonluk için)

| Sıralama | Puan |
|---|---|
| Şampiyon | 100 |
| Finalist | 70 |
| Yarı finalist | 50 |
| Çeyrek finalist | 25 |

### 5.5 Geçen sezon şampiyonu vurgusu

- Sezon şampiyonu olan oyuncunun isminin yanında 👑 ikon
- Tooltip: *"2026 Güz Erkek Tek Şampiyonu"*
- **Bir önceki sezon için aktif**, yeni sezon şampiyonu belli olunca taşır
- Kalıcı rozet (`badges` tablosunda) ayrıca verilir, profilde her zaman görünür

### 5.6 Yıllık Şampiyonluk

- 3 sezonun finale puanları toplamı
- Kategori başına en yüksek = Yıllık Şampiyon
- 🏆 ikon, kalıcı rozet
- Maksimum: 300 puan (3 sezonda da şampiyon)

### 5.7 ELO Geçmişi sayfası (her kategoride ayrı)

- Profile → "ELO Geçmişim" sekmesi
- Kategori tab'leri (sadece oyuncunun ELO'su olan kategoriler)
- Line chart: x-axis tarih, y-axis ELO
- Sezon başlangıçları dikey çizgi ("Bahar 2026 başladı")
- Soft reset noktasında görsel kırılma (eski sezon arka planda solgun, yeni sezon önde)
- Her chart noktası tıklanabilir → o maçın detayı
- Üst kart: "Bu sezon en yüksek: 1380 (10 Mart)", "Şu anki: 1290", "Trend: ↓ 90"
- Karşılaştırma sekmesi: 3 sezonun mini-chart'ı yan yana

Veri kaynağı: `matches.rating_before_*` ve `rating_after_*` kolonlarından türetilir (ayrı `elo_history` tablosu yok).

---

## 6. Gamification ve Sosyal

### 6.1 Rozet kataloğu (MVP)

**Kilometre taşları** (kümülatif, dostluk dahil):
- 1, 3, 5, 10, 25, 50, 100, 250, 500 maç

**Galibiyet** (sadece sıralama maçları):
- 1, 3, 5, 10, 25, 50, 100 galibiyet
- **Bagel:** 4-0 BÜ Klasik veya 6-0 set
- **Comeback:** 0-2'den 3-2 (3 Set Klasik) veya 1-3'ten 4-3 (BÜ Klasik)

**Sosyal:**
- İlk Çift Maçı
- Çevremi Genişletiyorum (5 farklı partner)
- Yeni Yüzler (10 farklı rakip)

**Sezon** (her sezon sıfırlanır, kazanılırsa profile eklenir):
- Sezon Top 10
- Sezon Top 3
- Sezon Şampiyonu
- Sezon Finalisti
- Sezon Yarı Finalisti

**Yıllık:**
- Yıllık Şampiyon (kategori başına, kalıcı)

**Eğlenceli:**
- Gece Kuşu (22:00 sonrası 5 maç)
- Erken Kuş (09:00 öncesi 5 maç)
- Bebek Kort Sevdalısı (10 maç Bebek Kort)
- Saha Gezgini (3 kortta da maç)
- Maraton (3 Set Klasik 5 maç)

**Sadakat:**
- 1. Sezon
- 1 Yıl (3 sezon)
- Kurucu (ilk 50 kayıt, otomatik, kontenjanlı)

### 6.2 Seviye sistemi (ELO eşik bazlı)

| ELO | Seviye | İkon |
|---|---|---|
| <1000 | Yeni Çekirge | 🌱 |
| 1000-1199 | Çaylak | 🎾 |
| 1200-1399 | Amatör | 🏃 |
| 1400-1599 | Rekabetçi | ⚡ |
| 1600-1799 | Usta | 🔥 |
| 1800-1999 | Elit | 💎 |
| 2000+ | Şampiyon | 👑 |

- Profilde isminin yanında, kullanıcının en yüksek ELO'su olan kategoriye göre
- Seviye atlama → push + modal
- Seviye düşmesi → sessiz

### 6.3 Vitrin (Pinned Badges)

- Max 3 rozet
- Ladder, feed, profil önizlemesinde isim yanında görünür
- Profil ekranı üst kısmında büyük gösterilir
- Yeni rozet kazanılınca modal'da "Vitrine ekle?" butonu

### 6.4 Profil ekranı

```
┌─ Avatar | Ad Soyad (he/him) ⚡ Rekabetçi 👑
│         | (opsiyonel: @bölüm · 3. sınıf)
│         | 🥇🔥💎  ← vitrin rozetleri
├──────────────────────────────
│ [Sıralamalar] [İstatistikler] [Rozetler] [ELO Geçmişi] [Maçlar]
└──────────────────────────────
```

- **Sıralamalar:** her kategoride ELO + rank
- **İstatistikler:** toplam maç, W/L oranı, en uzun seri, en sık kort/format/rakip
- **Rozetler:** kazanılmış (renkli) vs kazanılmamış (siyah-beyaz + nasıl kazanılır)
- **ELO Geçmişi:** Bölüm 5.7'de detay
- **Maçlar:** son 20 maç

Bölüm ve sınıf alanları kullanıcı toggle'ları ile gizlenebilir (`show_department`, `show_class_year`).

### 6.5 Başka oyuncu profili

- Aynı yapı ama:
  - Telefon, email gizli (sadece kabul edilmiş maç sonrası ortak maç ekranında görünür)
  - "Meydan Oku" butonu (kategori uygunsa)
  - Karşılıklı maç geçmişi mini özet: *"Aranızda 3 maç: Sen 2 - O 1"*

### 6.6 Sosyal özellikler — MVP'de YOK (YAGNI)

- Yorum / mesajlaşma
- Topluluk feed'i / paylaşım
- Arkadaş ekleme / takip
- Avatar dışında fotoğraf yükleme

Açık ilan akışı, karşılıklı maç geçmişi ve profil görüntüleme yeterli sosyalliği sağlar.

---

## 7. Admin ve Bildirimler

### 7.1 Admin yapısı

- **MVP:** Tek admin (kullanıcı). Admin'in ayrı bir player hesabı olur (farklı email; player hesabı BÜ maili, admin hesabı kişisel mail olabilir).
- **Faz 2:** Mac'ten erişilen web admin dashboard (Next.js + Vercel + aynı Supabase). Mobile'daki admin sekmesi sadeleşir.

`users.role = 'admin'` flag'i ile yetkilendirme. Admin maili BÜ domain restriction'dan istisna.

### 7.2 Admin paneli (mobil MVP — 6 ekran)

1. **Bekleyen İtirazlar** — açık `disputes`, karara bağlama
2. **Sezon Yönetimi** — sezonu bitir + finale başlat, geçmiş sezonlar, sonraki sezon ön ayarı
3. **Finale Bracket Yönetimi** — bracket görüntüle, çekilen yerine yedek
4. **Kullanıcı Yönetimi** — listele, detay, askıya al / banla / admin ata
5. **Topluluk Duyurusu** — başlık + içerik + hedef, in-app banner + opsiyonel push
6. **Sistem Sağlığı** — istatistikler, itiraz metrikleri, hata logları özeti

### 7.3 Bildirim kategorileri

| Kategori | Default | Olaylar |
|---|---|---|
| Maç teklifleri | ON | Sana meydan okuma, kabul/red, ilana başvuru, ilan seçim sonucu |
| Maç hatırlatma | ON | Maç bugün, 1 saat sonra |
| Skor onayları | ON | Skor onayını bekliyor, uyumsuzluk |
| ELO ve sıralama | OFF | ELO güncellendi, sıralama değişti, seviye atladın |
| Rozet | ON | Yeni rozet |
| Sezon ve turnuva | ON | Sezon başladı/bitti, finale eşleşmen, sezon sonu yaklaşıyor |
| Topluluk duyuruları | ON | Admin duyuruları |
| Pasiflik uyarısı | ON | 25 gündür maç yapmadın |

Ayarlar → Bildirimler → kategori başına toggle.

### 7.4 In-app bildirim merkezi

- Ana ekranda 🔔 + okunmamış sayı
- Tarihe göre sıralı liste, tıkla → ilgili ekran
- Tümünü okundu işaretle
- 30 günden eski bildirimler otomatik silinir

### 7.5 Realtime subscription gerektiren tablolar

- `matches` (status değişiklikleri)
- `match_score_submissions` (uyumsuzluk anlık banner)
- `match_requests` (yeni teklif feed)
- `disputes` (sadece admin)
- `notifications` (bildirim merkezi)

Diğerleri pull-to-refresh veya sayfa açılışında yüklenir.

### 7.6 Cron job listesi

| Cron | Sıklık | Görev |
|---|---|---|
| `update_user_status` | Günlük 03:00 TR | Donma/hibernasyon/inaktif güncellemesi |
| `expire_match_requests` | Her saat | 24h+ teklifler `expired` |
| `auto_confirm_matches` | Her saat | 48h+ onaylanmamış skor otomatik onay |
| `cleanup_notifications` | Günlük 04:00 | 30+ gün bildirim sil |
| `season_lifecycle_check` | Günlük 06:00 | Sezon bitti mi? Admin'e finale başlatma bildirimi |
| `cleanup_push_tokens` | Haftalık | 60+ gün inaktif token sil |

### 7.7 Performans tahmini (300 aktif oyuncu)

- Supabase free tier yeterli (500MB DB, 50K MAU)
- Expo Push ücretsiz
- Storage: avatar'lar ~15MB
- Edge Function: günde ~500 invocation (free tier 500K/ay)
- **İlk yıl ücretsiz çalışır**

### 7.8 Audit log

- Admin işlemleri (itiraz çözümü, banlama, sezon kapatma, duyuru) `audit_log`'a yazılır
- Kalıcı, silinmez
- Faz 2 web dashboard'da filtrelenebilir görünüm

---

## 8. Açık Notlar

### 8.1 Apple Developer ve store yayını
- Kullanıcının kendi Apple Developer hesabı var. APNs key, Bundle ID (örn. `tr.edu.boun.tennischallenger`), TestFlight grubu kurulumu implementation planında ele alınır.
- Google Play hesabı sonradan açılır (faz 2 Android).
- App Store policy gereği "Hesabımı Sil" özelliği MVP'de zorunlu (Bölüm 3.6'da var).

### 8.2 KVKK
- Toplanan veri minimum tutuldu (doğum tarihi, TC vb. yok).
- Hesap silme = anonimleştirme (kişisel veri silinir, maç geçmişi anonim kalır).
- Aydınlatma metni + gizlilik politikası: implementation planında hazırlanır (admin tarafından sağlanacak metin ile).

### 8.3 İlk admin atama
- DB migration ile manuel: ilk seed'de admin hesabının email'i `profiles.role='admin'` olarak insert edilir.
- Sonraki admin atamaları mobil admin panelinden.

### 8.4 Faz 2 öncesi MVP scope
- iOS app + Supabase backend
- Tek admin (kullanıcı)
- Mobile admin paneli (6 ekran)
- Web admin dashboard ve Android **MVP'de YOK**, sonraki sprint

---

## 9. Implementation sırası (özet — detay plan ayrı)

1. Monorepo kurulumu (Turborepo / pnpm workspaces, packages/shared, packages/supabase)
2. Supabase migration'ları (19 tablo + seed data: departments, courts, badges)
3. Edge Functions (ELO hesap, cron'lar, push gönderim)
4. `packages/shared` (types, ELO logic, zod schemas)
5. Mobile auth + onboarding flow (UI design link beklenir — placeholder ekranlarla başlanır)
6. Mobile maç akışı (oluştur, kabul, oyna, skor gir, onayla)
7. Mobile profil + ELO geçmişi + rozetler
8. Mobile admin paneli
9. Push notification setup (Expo + APNs)
10. UI design entegrasyonu (link teslim edildiğinde)
11. TestFlight beta dağıtımı
12. App Store yayını
13. Faz 2: Android + web admin dashboard

---

**Bu spec yaşayan bir belgedir.** Implementation sırasında çıkan değişiklikler bu dosyaya commit edilerek not düşülür.
