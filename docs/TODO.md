# ChallengeBu — Kanonik TODO

Bugünkü + ertelenen işlerin merkezi. Öncelik sırasında. Bir iş bitince
`[x]` yap, notunu ekle. Her yeni konuşmada bunun üzerinden yürüyelim.

---

## 🔴 ŞİMDİ (bugün / bu oturum)

### 1. Screenshot 6.3" fix + fastlane push (v1.1.1 build ile birlikte)
- [x] `iPhone 6.7 Display/` klasörüne 14 Plus ss'leri taşı
- [x] `sips` ile 1206×2622 kopya oluştur → `iPhone 6.3 Display/`
- [ ] ~~`fastlane screenshots` — v1.1.0 canlı, editable version yok~~
- [ ] v1.1.1 EAS build submit ederken beraber gönder → o zaman fastlane çalışacak
- Blocker: v1.1.1 build (Sentry DSN ready olduğunda tetiklenir)

### 2. OTA update push ✅ (1. tur atıldı — update group dbffec8e)
- [x] Tur 1: push router, in-app notif handler, button overflow, date format, audit dalga 1, Sentry scaffold
- [ ] **Tur 2 bekliyor:** audit dalga 2 + 3 + expo-push chunk
  ```
  cd apps/mobile && eas update --branch production --message "audit dalga 2+3 + push chunk"
  ```

### 3. Supabase edge function deploy ✅
- [x] `create-match-request` deploy edildi (matchRequestId payload)
- [ ] **Yeniden deploy gerekiyor:** `_shared/expo-push.ts` değişti → onu import eden 4 fonksiyon
  ```
  cd packages/supabase
  supabase functions deploy publish-announcement --project-ref zbjkauljjdosyuwguuhv
  supabase functions deploy dispatch-push --project-ref zbjkauljjdosyuwguuhv
  supabase functions deploy send-push-notification --project-ref zbjkauljjdosyuwguuhv
  supabase functions deploy send-message --project-ref zbjkauljjdosyuwguuhv
  ```

### 4. Sentry.io project setup ✅
- [x] Project açıldı: `hazar-ustun / challengebu-mobile`
- [x] 4 EAS env prod'a girildi (DSN, ORG, PROJECT, AUTH_TOKEN)
- [ ] **Yeni EAS build al** — Sentry native init o zaman aktif (v1.1.1)

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

### 7b. Kapasite P1 — 500-1000 user hedefi
- [ ] `hooks/use-ladder.ts:80-90` — `public_profiles.in('user_id', [...eloIds])` filter
- [ ] `(tabs)/leaderboard.tsx:286+` — ScrollView → FlatList + getItemLayout
- [ ] `hooks/use-messages.ts:76-88` — `.limit(50)` + reverse pagination (Task 8 M1 ile çakışıyor, birlikte yapılabilir)

### 7c. Kapasite P2 — 2000 user hedefi
- [ ] Messages retention cron (365 gün silinmiş / 730 gün hepsi)
- [ ] Dead-code realtime hook'ları sil (`use-active-matches.ts:63`, `use-match-requests.ts:73`)
- [ ] Supabase Pro tier ($25/ay) — Realtime 500 + DB 8GB + PITR

---

## 🟢 v1.1 (sonraki sürüm — hafta içinde)

### 8. Messaging redesign — 3 milestone
Kaynak: `docs/roadmap/v2-backlog.md` "Messaging redesign" section

**Milestone 1 (biggest UX win):**
- [ ] Optimistic send: cache append + retry chip
- [ ] Inbox previews: last message + relative timestamp + unread badge
- [ ] Thread pagination: reverse-chrono + limit(50) + FlatList inverted

**Milestone 2:**
- [ ] Composer multi-line (6 lines max)
- [ ] Attachment: photo (expo-image-picker → Storage)
- [ ] Typing indicator via Postgres broadcast

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
