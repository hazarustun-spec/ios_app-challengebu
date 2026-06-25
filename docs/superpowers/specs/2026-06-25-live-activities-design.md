# Live Activities — Canlı Maç Skoru (v1) — Tasarım

**Tarih:** 2026-06-25
**Özellik:** ChallengeBu! için Dynamic Island + Kilit Ekranı canlı maç skoru Live Activity'si.
**Kapsam:** Premium UX yol haritasının 1/5'i (Live Activities → Widget → Kutlama → Seri/Rekabet → Siri). Bu spec yalnızca Live Activities v1'i kapsar.

## 1. Amaç

Bir oyuncu maçı telefonunda canlı skorladığında (`app/match/[id]/score.tsx`), skoru Dynamic Island ve kilit ekranında canlı gösteren bir Live Activity başlatmak. Oyuncu telefonu cebine koyduğunda / kilitlediğinde / başka uygulamaya geçtiğinde skora tek bakışta ulaşır ve uygulamaya dönmeden puan takip eder.

Bu, App Store editör vitrini seviyesinde bir "wow" özelliği ve mevcut canlı skor akışına birebir oturuyor.

## 2. Konsept — Canlı Skor Companion

- **Başlar:** Oyuncu skor ekranına (`score.tsx`) girince Live Activity başlar.
- **Güncellenir:** Her "+" (puan) / oyun değişiminde **yerel** olarak güncellenir (push YOK — cihaz üstü ActivityKit update).
- **Biter:** "Maçı Bitir" / sonuç ekranına geçişte kısa bir final hâliyle ("Skor gönderildi 🎾") kapanır ve kısa süre sonra kaybolur.

Skor modeli (mevcut `score.tsx`): tek set, **4 oyuna ilk ulaşan kazanır** (margin ≥ 1), 3-3 → void. Puanlar `0 / 15 / 30 / 40 / Ad` (dizin 0–4). Tek-taraflı giriş — skoru giren oyuncu "Sen", diğeri "Rakip".

## 3. Arayüz Tasarımı (marka dili)

**Palet (theme/colors.ts'den birebir):**
- Marka dolgusu / "Sen" vurgusu: lime `#8FD43B` (parlak `#9BE048`, koyu `#5C8C1E`)
- Rekabet / "Rakip": court mavi `#2270BC`
- Metin/ink: `#161618`, ikincil `#65656E`
- Kazanan oyun vurgusu: win `#5C8C1E`; yıldız/aksan: `#F5B924`
- Kilit ekranı kart zemini: ink koyu `#161618` üzerine lime/court aksanlar (Dynamic Island zaten siyah)

**Font:** Skorlar için kalın yuvarlak (SF Pro Rounded Bold) — sportif ve native. App'in display fontu widget target'a bundle edilebilirse o kullanılır; aksi halde SF Rounded fallback.

**Sunumlar:**

```
Dynamic Island — compact (her zaman görünür):
  leading:  🎾            trailing:  2–1   ← oyun skoru (lime–court)

Dynamic Island — minimal (başka activity ile paylaşımlı):
  🎾2–1

Dynamic Island — expanded (uzun basınca):
  ┌──────────────────────────────┐
  │ 🎾  Maç sürüyor               │
  │ ───────────────────────────  │
  │ Sen        2      40          │   ← lime
  │ Rakip      1      30          │   ← court
  └──────────────────────────────┘

Kilit ekranı kartı:
  ┌──────────────────────────────┐
  │ 🎾 ChallengeBu! · Maç sürüyor │
  │                               │
  │ Sen      2  oyun   ·  40      │   ← lime şerit
  │ Rakip    1  oyun   ·  30      │   ← court şerit
  └──────────────────────────────┘
```

- "Sen" satırı lime aksanlı, "Rakip" court mavi aksanlı — kim önde belli olsun (önde olan satır daha vurgulu).
- Puan kolonu `0/15/30/40/Ad` metni; oyun kolonu sayısal.
- Void (3-3) durumunda "Berabere — void" rozeti; biten maçta "Bitti · 4–1" + kazanan vurgusu.

## 4. Veri Modeli (ActivityKit)

**ActivityAttributes (statik, maç boyunca sabit):**
- `youName: String` (ör. "Sen" veya kullanıcının adı)
- `opponentName: String`
- `categoryLabel: String?` (ör. "Erkek Tek") — opsiyonel, expanded'de küçük etiket

**ContentState (dinamik, her update'te değişir):**
- `gamesYou: Int`, `gamesOpp: Int`
- `pointsYou: Int` (0–4 dizin → 0/15/30/40/Ad), `pointsOpp: Int`
- `phase: enum { ongoing, void, finished }`
- `winnerIsYou: Bool?` (finished'te)

## 5. Yaşam Döngüsü ve Entegrasyon

JS-facing native modül API'si (`LiveMatchActivity`):
- `isSupported(): boolean` — iOS 16.1+ ve Live Activities açık mı
- `start(attrs): Promise<string|null>` — activity başlatır, id döner
- `update(state): Promise<void>`
- `end(finalState): Promise<void>`

`score.tsx` entegrasyonu:
- **Mount / ilk açılış:** `LiveMatchActivity.start({ youName, opponentName, categoryLabel })`. `isSupported()` false ise sessizce atlanır (no-op).
- **Her `award()` (state değişimi):** `LiveMatchActivity.update({ gamesYou: gA, gamesOpp: gB, pointsYou: pA, pointsOpp: pB, phase })`.
- **"Maçı Bitir" / unmount / submit:** `LiveMatchActivity.end({ ...final, phase: finished, winnerIsYou })`.
- Tüm çağrılar try/catch — Live Activity hatası skor akışını ASLA bozmaz.

> Not: "Sen/Rakip" eşlemesi — skoru giren kullanıcı A tarafı olmayabilir. `score.tsx` zaten `oppName` çözüyor; "Sen" = giren kullanıcı, oyun/puan A/B → Sen/Rakip eşlemesi giriş tarafına göre yapılır.

## 6. Teknik Mimari

1. **`expo-apple-targets` config plugin** → SwiftUI Widget Extension target'ı (Live Activity arayüzü: lock screen view + compact leading/trailing + minimal + expanded).
2. **İnce Expo native modül (Swift + ActivityKit)** ana uygulamada → `Activity<LiveMatchAttributes>.request/update/end`. JS köprüsü Expo Modules API ile.
3. **Paylaşılan `LiveMatchAttributes` struct** — hem modül hem widget target görmeli (ortak Swift dosyası / target membership).
4. **Info.plist:** `NSSupportsLiveActivities = YES`.
5. **Rebuild:** native target eklendiği için `npx expo run:ios --device "Hazar U." --configuration Release`. Kullanıcının telefonunda **Dynamic Island var** → tam test edilebilir.

## 7. Kapsam (v1) ve Non-Goals

**Dahil:** tek set canlı skor; Dynamic Island (compact/minimal/expanded) + kilit ekranı; yerel güncelleme; başlat/güncelle/bitir; marka dili; desteklenmeyen cihazda graceful no-op.

**Hariç (v1 değil):** push-tabanlı uzaktan güncelleme; çok-set/turnuva skoru; iki cihaz arası canlı senkron; Live Activity'den aksiyon butonları (App Intents — yol haritası #5); Android.

## 8. Riskler

- **`expo-apple-targets` ↔ Expo SDK 56 / RN 0.85 uyumu** — planlama aşamasında sürüm uyumu doğrulanacak; gerekirse target Xcode'a manuel eklenir.
- **Manuel `ios/` projesi** — proje manuel düzenlenmiş `ios/` (entitlements, imza) içeriyor. `expo prebuild` bunları ezebilir. Planda: ya target'ı mevcut Xcode projesine manuel/cerrahi ekle, ya da prebuild'i manuel değişiklikleri koruyacak şekilde reconcile et. **Bu en kritik entegrasyon riski.**
- **Paylaşılan struct + target membership** — modül ve widget target aynı `LiveMatchAttributes`'ı görmeli.

## 9. Doğrulama

- Cihazda: skor ekranına gir → Dynamic Island'da skor görünür; "+" bas → canlı güncellenir; telefonu kilitle → kilit ekranı kartı; "Maçı Bitir" → final hâli + kapanış.
- Destek kontrolü: Live Activities kapalıyken / desteklenmeyen cihazda skor akışı normal çalışır (no-op).
