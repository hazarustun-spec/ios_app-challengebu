# ChallengeBu — Kanonik TODO

Bugünkü + ertelenen işlerin merkezi. Öncelik sırasında. Bir iş bitince
`[x]` yap, notunu ekle. Her yeni konuşmada bunun üzerinden yürüyelim.

---

## ✅ v1.1.1 YAYINDA (5 Eyl 2026)

Build 40. Apple onayladı, App Store'da canlı.

- [x] Screenshots 6.7" + 6.3" slotlarına yüklendi (fastlane, version:1.1.1)
- [x] OTA tur 1 (dbffec8e) + tur 2 (6002eeb5)
- [x] 5 edge function deploy (create-match-request + expo-push chunk'ı import eden 4'ü)
- [x] Sentry kuruldu ve **build 40 ile native init aktif** — artık crash topluyor
- [x] Kalıcı review altyapısı (`is_demo` + RLS, migration 20260905000001)
- [x] Device QA: mesajlaşma, sıralama, review girişi — hepsi temiz

### İlk hafta izlenecekler
- [ ] **Sentry'yi kontrol et** — sentry.io/hazar-ustun/challengebu-mobile. İlk gerçek crash'ler burada görünecek. Source-map yüklendiyse stack trace okunabilir olmalı; değilse `SENTRY_AUTH_TOKEN` scope'unu kontrol et.
- [ ] Kullanıcı geri bildirimi topla (hello@shimal.app)

---

## 🔴 KULLANICI BİLDİRİMLERİ (5 Eyl 2026, canlıdan)

Operatörün kendi kullanımından + kullanıcı geri bildirimlerinden çıkan 11 madde.

### A. Oturum düşmesi — EN KRİTİK
- [x] **#1 Bir süre girilmeyince tekrar OTP istiyor.** Sebep: `autoRefreshToken: true` vardı ama `AppState` dinleyicisi yoktu. RN'de yenileme zamanlayıcısı bir JS interval'i; uygulama arka plana geçince OS onu askıya alıyor. Refresh token geçerli kalıyor ama kimse harcamıyor → access token ölüyor → sign-in ekranı → OTP-only uygulamada yeni bir mail kodu beklemek demek. `lib/supabase.ts`'e AppState tabanlı start/stop + cold start için tek seferlik `startAutoRefresh()` eklendi.
  - ⚠️ Cihazda doğrulanmalı: uygulamayı 1+ saat arka planda bırak, geri dön, oturum durmalı.

### B. UI bug'ları (JS-only)
- [ ] **#3 Avatar dairelerinin altındaki isimler ortalı değil.** Ana sayfa "sana uygun rakipler", Maçlar → aynı bölüm, Teklifler, İlanlar — hepsinde.
- [ ] **#5 "Reddedildi" yazısı ekran dışına taşıyor** — Gönderdiğim teklifler bölümü.
- [ ] **#9 "Finale bracket'ini gör"** — Yaz 2026 Sezonu sayfası. "Finale" diye bir kelime yok; Türkçesi "final".

### C. Eksik özellikler (JS-only)
- [ ] **#7 "Sana uygun rakipler" 3 slotla sınırlı** — kaydırılabilir olsun, olabildiğince oyuncu göstersin.
- [ ] **#8 Teklifler/İlanlar sekmelerine kırmızı bildirim noktası** — bekleyen teklif veya açık ilan varsa.
- [ ] **#10 Profilde son maçlar görünsün** — rakip adı, skor, tarih.
- [ ] **#11 Onboarding sınıf seçeneklerine "4+"** (okulu uzayanlar). DB enum değişikliği de gerekiyor (`class_year`).

### D. Backend
- [ ] **#4 İlan açılınca uygun kategorideki herkese bildirim.** Erkek Tek ilanı → erkek kategorisindekilere, Open Çift → open'dakilere. Şu an yalnızca direkt meydan okumada bildirim gidiyor; açık ilanlar sessiz.

### E. Tasarım
- [ ] **#2 Açılış ekranı animasyonu.** Mevcut `(auth)/splash.tsx` var (ball mark + üç nabız atan nokta). Daha iyisi isteniyor — ne yönde olacağı konuşulmalı.

### Cevaplanan
- **#6 Rozetler çalışıyor mu?** Altyapı tam: `award-badges` edge function'ı `confirm-match` sonrası çalışıyor, client'ta Profil → Rozetler sekmesi + rozet sanatı + profile sabitleme + kilit açılma animasyonu var. Ama **hiç rozet kazanılmadı**, çünkü rozet yalnızca maç onaylandığında veriliyor ve henüz hiç maç tamamlanmadı (herkes 1200 ELO / 0 maç). Kod hazır, hiç çalışmadı.

---

## 🟡 BU HAFTA

### 5. Audit Dalga 2 — veri koruma (5 item) ✅ e22d95a
- [x] #3 Retired kategori crash — safe fallback + auto-heal
- [x] #5 Phone format normalize — digit strip + toE164TR + null fallback
- [x] #6 Avatar upload MIME + upsert — use-upload-avatar pattern reuse + captureException
- [x] #8 Kort seçilmeden submit engelle — disabled guard
- [x] #11 Avatar OOM — ImageManipulator 512×512 JPEG 0.7

### 6. Audit Dalga 3 — UX polish (10 item) ✅ d5c4d81
- [x] #9 "Mesaj" swipe → useStartConversation + /messages/new fallback
- [x] #10 Doubles conflict UI — rakip takım filtresi + copy
- [x] #12 Uygun saat yoksa warn banner
- [x] #13 Magic-link no-op button kaldırıldı → statik hint
- [x] #14 Reanimated mutations → useEffect
- [x] #15 Profile edit → ayrı Ad + Soyad Field
- [x] #16 Result screen "Skoru gir" CTA + doğru copy
- [x] #17 Default time '18:00'
- [x] #18 karma_cift → "Karma Çift (kapatıldı)"
- [x] #19 KVKK CheckBox pointerEvents="none"

### 7. Kapasite analizi raporu ✅ 4d96006 + 316a78b
Rapor: `docs/capacity-analysis-2026-09.md`
- [x] Tarama tamam — ~500-800 aktif user'a kadar rahat
- [x] İlk gerçek eşik: Realtime 200 concurrent (~150-200 anlık aktif user)
- [x] `_shared/expo-push.ts` 100'lük chunk (defense in depth)
- [x] Raporun "P0 Expo Push bugün bozuk" iddiası doğrulamada düştü — düzeltildi

### 7b. Kapasite P1 — 500-1000 user hedefi ✅ 6179ab6
- [x] `use-ladder.ts` — `public_profiles` artık `.in('user_id', chunk)` (200'lük parça)
- [x] `(tabs)/leaderboard.tsx` — ScrollView → FlatList + memoized row
- [x] `use-messages.ts` — useInfiniteQuery, 50/sayfa, keyset cursor
- [ ] **200+ kullanıcıda dön:** `getItemLayout` konmadı — satır yüksekliği sabit değil (isim wrap ediyor). Gerekirse isme `numberOfLines={1}` + yükseklik 66'ya sabitleme.
- [ ] **200+ kullanıcıda dön:** ladder'a sunucu tarafı limit konmadı — rank hesabı tüm satırlara dayanıyor. Doğru çözüm: window function'lı sayfalı RPC (ayrı iş).

### 7d. `usePlayerRatings` filtresiz ✅ 029c38f
- [x] `profileIds` parametresi aldı, `.in(...)` 200'lük parça. İki çağıran (matches.tsx teklif/ilan sahipleri, open-applicants başvuranlar) yalnızca ekrandaki kişileri çekiyor.

### 7c. Kapasite P2 — 2000 user hedefi ✅ 029c38f (Pro hariç)
- [x] Messages retention cron — 730 gün, günlük 02:00 UTC. Migration `20260906000001`, **prod'a uygulandı**.
- [x] Dead-code realtime hook'ları silindi (52 satır). Not: `useMatchRequestsRealtime` tek başına 2 kanal açıyormuş — wire edilseydi maliyet kullanıcı başına 3 kanal olacaktı, rapor 2 demişti.
- [ ] Supabase Pro tier ($25/ay) — Realtime 500 + DB 8GB + PITR. **~200-300 aktif kullanıcıda gerekli.**

---

## 🟢 v1.1 (sonraki sürüm — hafta içinde)

### 8. Messaging redesign — 3 milestone
Kaynak: `docs/roadmap/v2-backlog.md` "Messaging redesign" section

**Milestone 1 ✅ 6179ab6:**
- [x] Optimistic send: onMutate append + onError rollback + pending bubble
- [x] Thread pagination: useInfiniteQuery 50/sayfa + inverted FlatList
- [x] Inbox previews — zaten varmış (brief yanlıştı); "dün" bucket + empty-state CTA eklendi
- [x] **Device QA yapıldı** (build 40, TestFlight, iPhone): inverted FlatList + klavye davranışı sorunsuz, optimistic send çalışıyor, sıralama akıcı, review girişi çalışıyor. Android transform hâlâ test edilmedi (Android sürümü v2'de).

**Milestone 2:**
- [x] Retry queue ✅ 8ef5eaa — kalıcı outbox (zustand + expo-secure-store), başarısız mesaj kırmızı baloncuk olarak kalıyor, dokununca yeniden gönderiliyor, uzun basınca atılıyor.
  - ⚠️ **CANLIDA DEĞİL.** Commit'te duruyor, OTA atılmadı (5 Eyl kararı). Cihazda hiç test edilmedi: hata baloncuğu, dokunma, cold-start rehydrate, realtime dedupe penceresi — hiçbiri doğrulanmadı. Bir sonraki OTA/build'den önce TestFlight'ta denenmeli.
  - Bilinen açık: `send-message` satırı yazıp yanıtı kaybederse retry mesajı çoğaltır (edge function idempotent değil).
- [ ] Composer multi-line (6 lines max)
- [ ] Attachment: photo (expo-image-picker → Storage)
- [ ] Typing indicator via Postgres broadcast
- [ ] Delivery ticks (read_at zaten var, sadece göster)

**Milestone 3:**
- [ ] Message reactions (❤️👍😂)
- [ ] Long-press menu (Reply/Copy/Delete/Report)
- [ ] Deleted-message tombstone

### 9. Add-to-Calendar
Kaynak: `docs/roadmap/v2-backlog.md` "Add-to-Calendar"
- [ ] `expo-calendar` install
- [ ] `NSCalendarsUsageDescription` app.json'a
- [ ] Match detail'e "Takvime ekle" bottom sheet (Apple / Google seçim)
- [ ] Google Calendar URL builder
- [ ] `calendar_event_id` matches tablosuna ekle (migration)

### 10. Website deploy
- [ ] `shimal.app/challengebu/*.html` güncellenmiş (canlı) → doğrula: `curl -sI https://shimal.app/challengebu/gizlilik.html`
- [ ] Yeni değişiklikler (post-launch) için otomatik sync — GH Actions?

---

## 🔵 v2 (uzun vade)

Kaynak: `docs/roadmap/v2-backlog.md` (tam liste)

### Platform
- [ ] Android sürümü (EAS Android build + Google Play)
- [ ] Dark mode
- [ ] İngilizce dil desteği
- [ ] Web admin dashboard
- [ ] Home screen widget (WidgetKit)

### Rekabet & retention
- [ ] Lig/divizyon sistemi (Duolingo-style)
- [ ] Rekabet kartı + rematch
- [ ] FOMO push, bölüm derbisi
- [ ] Haftalık özet, re-engagement push
- [ ] Davet/referral, sosyal feed, arkadaş sistemi

### Özellik fikirleri
- [ ] Maç sonrası fotoğraf
- [ ] Maç silme
- [ ] Kort rezervasyon uyarısı
- [ ] Mascot
- [ ] Stars currency
- [ ] Ek rozetler / sezon ödülleri
- [ ] Ses efektleri

### Onboarding & admin
- [ ] Kampüs / tercih edilen kort
- [ ] Hedef (rekabet / eğlence / antrenman)
- [ ] Haftalık oyun sıklığı hedefi
- [ ] Instagram/WhatsApp handle
- [ ] Deneyim yılı
- [ ] Admin Users ekranı zenginleştirme

### Monetizasyon
- [ ] Gelir modeli kararı (abonelik / sponsor / court ortaklığı)
- [ ] App Privacy re-declare (data satışı yapılırsa)

### Test / CI
- [ ] Maestro flow'ların tamamı yeşil
- [ ] CI Maestro lane (macOS runner)

---

## ⚙️ Operasyon notları (kod değil, bilinmesi gerekenler)

### Admin rolü sıfırdan kurulan ortamda gelmez
`20260609000005_initial_admin_seed.sql` migration'ının hedef e-postası
rebrand sırasında `CHANGE_ME_BEFORE_DEPLOY@example.com` placeholder'ına
çevrildi (kişisel mail repoda durmasın diye) ve migration bu değeri
görünce hiçbir şey yapmadan çıkıyor. Yani **yeni bir Supabase ortamı
kurarsan admin hesabı olmayacak** — Ayarlar'da "Admin paneli" satırı
hiç görünmez.

Elle set et (Dashboard → SQL Editor). `profiles.email` yalnızca kayıt
INSERT'inde yazılıyor (RLS o kolonda UPDATE'i revoke ediyor), o yüzden
eşleşmeyi `auth.users` üzerinden yap — `profiles.email` üzerinden yapmak
sessizce 0 satır güncelleyebilir:

```sql
update public.profiles p
   set role = 'admin'
  from auth.users u
 where u.id = p.user_id
   and lower(u.email) = lower('senin@mailin.edu.tr')
returning p.user_id, u.email, p.role;
```

Bir satır dönmeli. Sonra uygulamada çıkış yap → tekrar gir (rol profil
yüklenirken okunuyor).

Kalıcı çözüm istenirse: migration hedef maili bir Supabase secret'ından
okusun. Prod ayakta olduğu sürece gerekmiyor.

### Prod'da admin rolü nasıl kaybolmuştu (5 Eyl 2026)
2 Eylül'de çalıştırılan `reset-all-and-seed-review-production.sql`
reviewer dışındaki bütün profilleri sildi. Operatör tekrar kayıt olunca
profil `role = 'player'` varsayılanıyla yeniden oluştu. O script artık
⛔ DO-NOT-RUN başlığıyla arşivde; canlı veriye karşı çalıştırılmamalı.

---

## ✅ TAMAMLANANLAR (referans için)

### Bu oturum (2 Eyl 2026)
- [x] Rebrand — Boğaziçi/BÜ tüm izlerini kaldır → `.edu.tr` genel gate
- [x] App Store resubmission → APPROVED (Ready for Distribution)
- [x] Post-approval cleanup SQL — 5 opponent + reviewer wipe, seed
- [x] Review-login Edge Function silindi
- [x] Website (shimal.app/challengebu) update
- [x] Fastlane metadata + review notes güncel
- [x] Push notification route bug fix (matchRequestId/season/message)
- [x] In-app notification handler fix (conversationId + snake_case)
- [x] Match request card: date format + button overflow
- [x] Audit Dalga 1 — 4 kritik silent-fail
- [x] Sentry code scaffold (init/wrap/user link)
- [x] Messaging redesign brief v2-backlog'a
- [x] Add-to-Calendar entry v2-backlog'a
- [x] Bagel badge description prod DB'de "Klasik"

---

## Kullanım kuralı

- Bir iş bitince `[ ]` → `[x]`
- Yeni fikir çıkarsa doğrudan buraya ekle (kategori uygun)
- Her session başında **1. maddeden başla** — atlamayalım
- v2 maddeleri kaynağı `docs/roadmap/v2-backlog.md`
