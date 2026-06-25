# Live Activities — İnteraktif Çift-Yön Canlı Maç Skoru — Tasarım

**Tarih:** 2026-06-25
**Özellik:** Her iki oyuncunun **kilit ekranından** (Dynamic Island + Lock Screen) maç skorunu değiştirebildiği, anlık senkronlanan canlı maç Live Activity'si.
**Platform:** iOS 26 (kullanıcı cihazı) — interaktif Live Activities, App Intents, push-to-start tam destekli.

## 1. Konsept

Maç başladığında iki oyuncuda da bir Live Activity başlar. Her oyuncunun kilit ekranındaki activity'de **butonlar** vardır (App Intents). Kim basarsa skor **sunucuda** güncellenir ve **her iki cihaza** anlık yansır — uygulama açılmadan. İkisi de kilit ekranından skorlayabilir.

Tenis modeli (mevcut `score.tsx`): tek set, 4 oyuna ilk ulaşan (margin ≥ 1), 3-3 void; puanlar 0/15/30/40/Ad.

## 2. Mimari (sunucu-otoriter)

İki oyuncu da skoru değiştirebildiği için **tek doğru kaynak sunucuda** olmalı. Tenis puanlama mantığı sunucuya taşınır.

```
A kilit ekranı [Sen +1][Rakip +1] ─┐
                                   ├─→ award-point edge fn ──┬─→ APNs (liveactivity) → A & B Island
B kilit ekranı [Sen +1][Rakip +1] ─┤   (tenis mantığını      └─→ Realtime broadcast → A & B app (score.tsx)
score.tsx "+" (app içi) ───────────┘    uygular, live_match_scores'a yazar)
```

**Bileşenler:**
1. **`live_match_scores` tablosu** — otoriter canlı skor: `match_id` (PK), `games_a`, `games_b`, `points_a`, `points_b`, `phase`, `winner`, `version` (optimistic), `updated_at`. RLS: maç katılımcıları okur; yazma yalnız `award-point` (service_role).
2. **`award-point` edge fn** — `{ matchId, side: 'a'|'b' }` alır, katılımcı doğrular, **tenis mantığını** uygular (puan→oyun→set, deuce, 3-3 void — `score.tsx` kurallarıyla bire bir), `live_match_scores`'u günceller, sonra (a) iki activity token'ına APNs liveactivity push, (b) Realtime broadcast. Idempotent değil ama `version` ile sıralı.
3. **`AwardPointIntent` (LiveActivityIntent, Swift)** — kilit ekranı butonu → app process'inde (arka planda) çalışır → `award-point`'e POST → yeni state ile yerel activity'yi günceller. Auth token'ı App Group/Keychain'den okur (JS bridge'siz).
4. **İnteraktif Live Activity UI** — lock screen + Dynamic Island expanded'de iki buton (`Button(intent: AwardPointIntent(side:))`) + skor; compact/minimal salt-skor. Marka dili (Sen lime / Rakip court / ink).
5. **`register-activity-token` edge fn** + token tablosu (`live_activity_tokens`: match_id, user_id, update_token, push_to_start_token) — modül başlatınca kaydeder.
6. **Doğrudan APNs** (edge fn) — `.p8` (vault), ES256 JWT, `apns-push-type: liveactivity`. Expo push DESTEKLEMEZ. Dev build → sandbox APNs.
7. **push-to-start** (iOS 17.2+) — maç başlayınca rakibin push-to-start token'ına push → activity'si app kapalıyken bile otomatik başlar.
8. **`score.tsx` (sunucu-driven)** — "+" butonları `award-point` çağırır. Ekran **açılışta mevcut skoru `live_match_scores`'tan yükler** + Realtime ile canlı dinler. Böylece **kilit ekranında yapılan her değişiklik, app açıldığında orada da görünür** (ve maç sürerken canlı güncellenir). Yerel `useState` skorlama yerini sunucuya bırakır (kilit ekranı + app + iki cihaz hep tutarlı, tek doğru kaynak).
9. **Native modül** — `start(pushEnabled)` + `getUpdateToken()` + `getPushToStartToken()` ekler (Plan 1 modülünün üstüne).

## 3. Veri Modeli

`live_match_scores`: yukarıdaki kolonlar. Maç bitince (phase=finished/void) satır kalır, activity'ler `end` olur, sonuç mevcut `submit-match-score`/`confirm-match` consensus akışına gider (skor doğru kaynaktan gelir).

ActivityKit `ContentState`: `gamesA/gamesB/pointsA/pointsB`, `phase`, `winner`. `ActivityAttributes`: `matchId`, `youSide`, `nameA`, `nameB`. (Plan 1'deki yapı + push token desteği.)

## 4. Yaşam Döngüsü

- **Maç başlangıcı (handshake):** iki oyuncu da activity başlatır + token kaydeder; push-to-start ile rakip app'te değilse de başlar. `live_match_scores` satırı 0-0 oluşur.
- **Skorlama:** kilit ekranı butonu / app "+" → `award-point` → otoriter güncelle → APNs (iki activity) + Realtime (iki app). Çakışma `version`'la sıralanır.
- **Bitiş:** phase finished/void → activity'ler final hâliyle `end`; skor consensus/onay akışına aktarılır; token'lar temizlenir.
- Tüm çağrılar hatada akışı bozmaz; APNs/Realtime hatası skoru DB'de tutmayı engellemez.

## 5. Kapsam ve Non-Goals

**Dahil:** interaktif çift-yön kilit ekranı skorlama; sunucu-otoriter skor + tenis mantığı; APNs senkron + Realtime; push-to-start; marka UI; desteklenmeyen durumda app-içi skorlama fallback.
**Hariç:** çok-set/turnuva; Android; offline skorlama (sunucu erişimi şart — kısa kesintide app-içi kuyruk düşünülebilir, v1 değil).

## 6. Riskler

- **App Intent auth** — `LiveActivityIntent` JS'siz Swift; backend'e auth için token'ı App Group/Keychain'den okumalı. Token paylaşımı + yenileme kurulmalı. **En kritik yeni risk.**
- **Doğrudan APNs in Deno** — ES256 JWT, HTTP/2, sandbox vs production.
- **Çakışma/sıra** — iki oyuncu aynı anda basarsa `version` + sunucu sıralaması; UI optimistic + sunucu düzeltir.
- **Test:** cloud'da tek kullanıcı/cihaz → A tarafı + APNs yolu (kendine-push) tek cihazda; gerçek çift-cihaz görseli 2. cihaz ister.
- **`score.tsx` yeniden yazımı** — yerel→sunucu-driven; mevcut akış korunmalı (Maçı Bitir, sonuç ekranı).

## 7. Uygulama Sırası (plan bunu fazlara böler)

1. Backend skor motoru: `live_match_scores` + `award-point` (tenis mantığı) + Realtime. (Tek cihazda app-içi test edilebilir.)
2. `score.tsx` sunucu-driven + Realtime. (Tek cihazda tam test.)
3. Doğrudan APNs + token kayıt + activity push senkron. (Kendine-push ile test.)
4. İnteraktif Live Activity (App Intent butonları) + auth token paylaşımı.
5. push-to-start + iki-cihaz uçtan uca.

> Plan 1 (yerel canlı skor, BİTTİ) bunun native temeli. Bu spec onun üstüne kurar.
