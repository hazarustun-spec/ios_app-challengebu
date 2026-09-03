# ChallengeBu — Kanonik TODO

Bugünkü + ertelenen işlerin merkezi. Öncelik sırasında. Bir iş bitince
`[x]` yap, notunu ekle. Her yeni konuşmada bunun üzerinden yürüyelim.

---

## 🔴 ŞİMDİ (bugün / bu oturum)

### 1. Screenshot 6.3" fix + fastlane push
- [ ] `iPhone 6.7 Display/` klasörüne 14 Plus ss'leri taşı
- [ ] `sips` ile 1206×2622 kopya oluştur → `iPhone 6.3 Display/`
- [ ] `fastlane screenshots` → 6.5" + 6.7" + 6.3" slotları overwrite
- Kaynak: konuşma "kanka öyle işaret çıkmıyor"
- Blocker: yok

### 2. OTA update push (bugünkü tüm fix'ler canlıya)
- [ ] `eas update --branch production --message "..."`
- Girecek fix'ler: push router (matchRequestId/season), in-app notif handler (conversationId), button numberOfLines, match-request date format, audit dalga 1 (4 kritik silent-fail), Sentry scaffold
- **Not:** Sentry native init için sadece OTA yetmez, DSN + build sonraki EAS build ile aktifleşir. OTA'da yalnızca JS scaffold gider (sessiz — DSN yoksa no-op).

### 3. Supabase edge function deploy
- [ ] `supabase functions deploy create-match-request --project-ref zbjkauljjdosyuwguuhv`
- Sebep: `data.matchRequestId` alanı payload'a eklendi

### 4. Sentry.io project setup (senin yapman gereken)
- [ ] sentry.io'da yeni project aç (React Native / Expo)
- [ ] DSN kopyala
- [ ] `eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --value <DSN>`
- [ ] SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT'i de EAS Secrets'a ekle (source-map upload için)
- [ ] Yeni EAS build al — Sentry native init o zaman aktif

---

## 🟡 BU HAFTA

### 5. Audit Dalga 2 — veri koruma (5 item)
Kaynak: `docs/audit-2026-09-daily-use.md`
- [ ] #3 Retired kategori crash — `match/new/detail.tsx:135` non-null assertion fallback
- [ ] #5 Phone format normalize — `+90` prepend, digit strip
- [ ] #6 Avatar upload MIME + upsert — use-upload-avatar.ts pattern kopyala
- [ ] #8 Kort seçilmeden submit engelle — Button disabled guard
- [ ] #11 Avatar OOM — ImageManipulator ile 512x512 resize

### 6. Audit Dalga 3 — UX polish (5 orta + 3 düşük)
Kaynak: `docs/audit-2026-09-daily-use.md`
- [ ] #9 "Mesaj" swipe action inbox yerine thread'e
- [ ] #10 Doubles conflict UI takım gruplama
- [ ] #12 Bugün + geç saat time boşa düşer — Devam disabled
- [ ] #13 "Sihirli bağlantıyı kullandım" no-op button — kaldır veya Mail app aç
- [ ] #14 Reanimated render body mutate → useEffect
- [ ] #15 Profile edit tek input → 2 input
- [ ] #16 Result screen "Skorun gönderildi" copy → `mySubmission` kontrolü
- [ ] #17 Default time picker seçeneklerinde yok — 18:00'a al
- [ ] #18 Retired karma_cift label kalıntısı
- [ ] #19 KVKK checkbox double-tap — pointerEvents="none"

### 7. Kapasite analizi raporu
- [ ] Leaderboard query pagination var mı?
- [ ] Avatar upload boyut sınırı?
- [ ] Realtime subscription cleanup?
- [ ] Supabase Free tier limits kontrol
- [ ] Tahmin: kaç user'a kadar rahat, ne zaman Pro tier?

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
