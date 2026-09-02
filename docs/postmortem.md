# ChallengeBu! — Postmortem (v1 öncesi)

**Tarih:** 2026-08-04
**Kapsam:** 2026-06-06 (ilk commit) → 2026-07-29 (son commit), yayına çıkmadan önce
**Durum:** App Store 1.1.0 `PREPARE_FOR_SUBMISSION`, bir kez reddedilmiş (2026-07-01), henüz yayında değil

## Ölçüler

| | |
|---|---|
| Süre | ~8 hafta |
| Commit | 532 (495'i 2026-06'da) |
| Ekran (`app/**/*.tsx`) | 79 |
| Component | 111 |
| Hook | 75 |
| Edge function | 28 |
| Migration | 79 |
| TestFlight build | 17 |
| Gerçek kullanıcı | 0 |

---

## Hatalar (maliyet sırasına göre)

### 1. Doğrulamadan önce kapsam

8 haftada sezon, turnuva, rozet, rank sistemi, ELO geçmişi, mesajlaşma +
engelleme/şikayet, çiftler, Live Activities ve bildirimler yazıldı. Tek gerçek
kullanıcı yokken.

Sonuç, kullanıcının kendi ifadesiyle geldi: *"uygulamanın kullanımı çok karışık
oldu."* Bu sürpriz değil, doğrudan sonuç.

`docs/v1-deferred.md` Android'i, dark mode'u ve İngilizce'yi erteliyor ama v1'de
turnuva ve rozet sistemini tutuyor — erteleme kararları yanlış eksende verilmiş.
Ertelenecek olan platform genişliği değil, ürün yüzeyiydi.

Churn verisi aynı şeyi söylüyor:

```
28  apps/mobile/app/_layout.tsx
22  apps/mobile/app/(tabs)/matches.tsx
21  apps/mobile/app.json
18  apps/mobile/app/(tabs)/index.tsx
14  apps/mobile/components/ui/TabBar.tsx
```

`matches.tsx` 22 kez değişmiş ve hâlâ "karışık" geri bildirimi aldı. 22 revizyon
bir ekranı oturtamadıysa sorun revizyonda değil, ekranın taşıdığı kavram
sayısında (yaklaşan + gelen teklif + gönderilen teklif + açık ilan, tek sekmede).

79 migration da aynı hikâye: şema hiç oturmadı.

### 2. Marka kararı geç verildi

- `a34fff4 rebrand: Tennis Challenger -> ChallengeBu!`
- `d64245e rebrand: bundle id -> app.challengebu.ios (was app.challengebu.ios)`
- `c1abf30 fix(review): de-üniversite metadata+UI, populated review seed, App Store audit`

Bundle ID değişimi pahalı olan. Asıl bedel üniversite bağı: App Store reddinin
gerekçelerinden biri oldu ve **ekran görüntüleri 5 hafta sonra hâlâ
yenilenmedi.** `apps/mobile/fastlane/Fastfile:30` bunu itiraf ediyor:

```ruby
# screenshots must be regenerated after the "Klasik" rename and
# uploaded separately
```

Yorum yazmak işi yapmıyor. Bugün hâlâ açık madde.

### 3. Apple reddi tamamen önlenebilirdi

`docs/APP_STORE_RESUBMIT.md:10`:

> App Store Connect'teki "Password" alanına `42.42.42.42` yazılmış; uygulamada
> şifre alanı yok. Doğru kod **424242** (altı rakam, nokta yok).

OTP-only bir uygulamada şifre alanına IP formatında bir değer girilmiş. Tek
alan. Maliyeti: tam bir inceleme döngüsü + Apple'ın artık demo video istemesi.

O video hâlâ yok — review notlarında placeholder duruyor:

```
DEMO_VIDEO_URL: PASTE_YOUR_LINK_HERE_BEFORE_SUBMIT
```

### 4. Testler hiç çalışmadı, bu geç fark edildi

23 `test:` commit'i, pgTAP suite'leri, Maestro flow'ları yazıldı. Bugünkü
gerçek: **11 fail / 10 error**, hepsi `apps/mobile/components/ui/__tests__/*`.

Kök neden ikili:

1. RN 0.85 + bun `mock.module` named-export uyumsuzluğu —
   `Export named 'View' not found in module react-native/index.js`
2. Hook kullanan bileşenlerin renderer'sız düz fonksiyon olarak çağrılması —
   `Invalid hook call`

`@testing-library/react-native` hiç kurulmamış.

En keskin nokta: **`bun` bu makinede kurulu değildi** (`~/.bun/bin/bun` kırık
symlink). O testler yazıldıkları günden beri bir kez bile çalıştırılmamış.

### 5. Otomasyon İngilizce a11y label'larına kilitlendi, sessizce bozuldu

`apps/mobile/.maestro/screenshots.yaml:59-69`:

```yaml
- tapOn: "leaderboard"
- tapOn: "profile"
- tapOn: "new-match"
```

`components/ui/tab-slots.ts:35-39` label'ları Türkçeleştirince (Sıralama /
Profil / Yeni maç) bu flow öldü. Hiçbir CI kapısı yakalamadı. Zaman
kazandırması gereken otomasyon bakım borcuna dönüştü.

### 6. Release otomasyonu yanlış yeri otomatikleştirdi

`Fastfile`'da `metadata` ve `release` lane'leri var — ikisinde de
`skip_screenshots: true`. Otomasyona gerçekten ihtiyaç duyan tek iş dışarıda
bırakılmış.

Sonuç: ekran görüntüleri elle yüklendi ve App Store Connect'te **4 dosya 2'şer
kez** duruyor (8 kayıt: `01-home.png` ×2, `02-leaderboard.png` ×2, …).

### 7. Vitrin görselleri boş hesaptan çekildi

Yüklü 4 karede görünenler:

- "Henüz maç yok", "Henüz aktif maçın yok.", "Henüz tamamlanmış maçın yok."
- "Henüz rozet yok.", "Henüz sıralama verin yok."
- Sıralamada **"Test User" ×5**, podyumda **"Test 1201" ×3**

Placeholder veri App Store'da başlı başına red sebebi (Guideline 2.3.x —
ekran görüntüleri uygulamayı gerçek kullanımda göstermeli). Yani mevcut
görseller bir sonraki reddi hazırlıyor olabilir.

Ayrıca dördü de eski tab ikonlarını (mavi `+`, tablo Maçlar) gösteriyor;
build 17'de bunlar tenis topu + takvim oldu.

### 8. Yedek yoktu — 532 commit tek diskte

`origin` `/Users/hazarustun/Desktop/VIBE CODING/tennis-challenger` dizinini
gösteriyordu; repo taşındıktan sonra o dizin silinmiş. Haftalarca sıfır offsite
yedek. 2026-08-04'te tesadüfen fark edildi, GitHub private repo'ya alındı
(`hazarustun-spec/tennis-challenger`).

### 9. Yerel ortam ayağa kalkmıyor

`apps/mobile/.env.local` → `http://127.0.0.1`, ama Docker kapalı ve seed hazır
değil. Yerel doğrulama yapılamayınca her doğrulama TestFlight turuna bağlanıyor
— tur başına 20-40 dakika.

---

## Doğru yapılanlar

- **Commit disiplini** — Conventional Commits, 532 commit'te merge karmaşası
  yok, geçmiş düz ve okunur.
- **Geri alma cesareti** — `78c406a Revert "frosted-glass blur"`,
  `f5c2b84 revert(ui): remove card gradients (disliked)`. Beğenilmeyen şey
  savunulmadı, silindi.
- **291 feat / 115 fix** — hatalar biriktirilmemiş, kovalanmış.
- **App Review notları** — 2732 karakter, adım adım, gerçekten iyi yazılmış.
- **Son iş (`feat/app-simplification`)** — teklif iptali için önce RLS
  politikasının var olduğu doğrulandı (`20260619000004_match_request_creator_delete.sql`),
  gereksiz migration yazılmadı. Whole-branch review, hiçbir tekil task
  review'ünün göremeyeceği bir hatayı yakaladı: `conversations` cache'i
  invalidate edilmiyordu, `conversations.request_id` cascade silinince okunmamış
  rozeti (artık 4 sekmede) hayalet sayım yapıyordu.

---

## Teşhis

**Yayına çıkmadan önce çok fazla ürün yapıldı, ve doğrulama araçları (test,
otomasyon, yerel ortam) yazıldı ama hiç çalıştırılmadı.**

Kalan iş listesi — ekran görüntüsü, demo video, App Privacy ayarı — teknik
değil, altı haftadır ertelenen operasyonel maddeler.

## Bir sonraki sefere kurallar

1. **Yayına çıkmadan özellik ekleme.** İlk 10 gerçek kullanıcı, ikinci
   özellik dalgasından önce gelir.
2. **Yazılan test çalıştırılmadan commit edilmez.** Suite yeşil değilse
   "test yazdım" denmez.
3. **Marka ve bundle ID ilk haftada kilitlenir.** İkisi de sonradan
   değiştirilince metadata, görsel ve store kaydının tamamı yeniden üretilir.
4. **Store metadatası kod gibi ele alınır.** Ekran görüntüsü üretimi de
   `deliver` hattına girer; `skip_screenshots: true` bir çözüm değil, borç.
5. **Vitrin görselleri dolu ve gerçek veriyle çekilir.** Boş durum ekranı
   pazarlama materyali değil.
6. **Uzak yedek ilk gün kurulur.** Yerel disk yedek değildir.
7. **Yerel ortam tek komutla kalkar.** Kalkmıyorsa her doğrulama uzak
   build'e bağlanır ve döngü 20-40 dakikaya çıkar.
