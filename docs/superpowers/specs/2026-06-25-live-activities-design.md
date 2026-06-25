# Live Activities — İki-Cihaz Canlı Maç Skoru — Tasarım

**Tarih:** 2026-06-25
**Özellik:** ChallengeBu! için Dynamic Island + Kilit Ekranı canlı maç skoru Live Activity'si — **iki cihaz canlı senkron** (bir oyuncu skorlar, rakibin Island'ında da anlık görünür).
**Kapsam:** Premium UX yol haritasının 1/5'i. Bu spec tam iki-cihaz senkron sürümünü kapsar (kullanıcı kararı: tek seferde tam senkron).

## 1. Amaç ve Konsept

Bir oyuncu (A) maçı telefonunda canlı skorlarken (`app/match/[id]/score.tsx`, "+" ile puan), skor:
1. **A'nın** Dynamic Island + kilit ekranında **yerel** olarak anında güncellenir, ve
2. **Rakibin (B)** Dynamic Island + kilit ekranında — **B'nin uygulaması kapalı olsa bile** — backend üzerinden **doğrudan APNs ActivityKit push** ile canlı güncellenir.

Skorlama modeli değişmez: A girer, B canlı **izler**, maç sonunda ikisi de skoru onaylar (mevcut consensus akışı). İki oyuncu da maç boyunca skoru cebinden/kilit ekranından takip eder.

Skor modeli (mevcut `score.tsx`): tek set, **4 oyuna ilk ulaşan kazanır** (margin ≥ 1), 3-3 → void. Puanlar `0/15/30/40/Ad`.

## 2. Mimari — Bileşenler

```
A (skorlayan)                    Backend (Supabase)              B (izleyen)
─────────────                    ──────────────────              ───────────
score.tsx "+" → yerel update ─┐
                              ├─ POST relay-live-score ──→ APNs (liveactivity push) ──→ B Live Activity günceller
LiveActivity (A) ◀── yerel ───┘   · B'nin update token'ını bulur     (uygulama kapalı olsa bile)
                                   · .p8 ile ES256 JWT imzalar
                                   · api.push.apple.com'a POST
maç başında (handshake):
A + B activity başlatır ──────→ register-activity-token (match_id, user_id, update/push-to-start token)
```

**Bileşenler:**
1. **Live Activity UI** (SwiftUI Widget Extension) — iki oyuncu da görür; `youSide`'a göre "Sen/Rakip" render.
2. **Native modül** (Swift + ActivityKit) — `isSupported`, `start(attrs, pushEnabled)`, `update(state)` (yerel), `end(final)`, başlatınca **update push token**'ı + (iOS 17.2+) **push-to-start token**'ı verir.
3. **Token kayıt tablosu** `live_activity_tokens` — (match_id, user_id, update_token, push_to_start_token, updated_at). RLS: kullanıcı kendi satırını yazar.
4. **`relay-live-score` edge fn** — A'nın skor değişimini alır, B'nin update token'ını bulur, **doğrudan APNs**'e `apns-push-type: liveactivity` push gönderir (content-state = yeni skor).
5. **`start-opponent-activity`** (iOS 17.2+ push-to-start) — maç aktif olunca rakibin push-to-start token'ına push → rakibin activity'si uygulama kapalıyken bile **otomatik başlar**. Fallback: rakip uygulamadayken kendi başlatır.
6. **Doğrudan APNs entegrasyonu** — `.p8` APNs auth key (vault'ta), key ID + team ID; Deno'da ES256 JWT imzala; HTTP/2 POST `api.push.apple.com/3/device/{activityToken}`. (Expo push servisi Live Activity push'u DESTEKLEMEZ → doğrudan APNs şart.)
7. **`score.tsx` entegrasyonu** — her `award()`'da: yerel `update()` + `POST relay-live-score`.

## 3. Veri Modeli (ActivityKit)

**ActivityAttributes (statik):** `matchId: String`, `youSide: "a"|"b"`, `nameA: String`, `nameB: String`, `categoryLabel: String?`
**ContentState (dinamik):** `gamesA: Int`, `gamesB: Int`, `pointsA: Int` (0–4), `pointsB: Int`, `phase: ongoing|void|finished`, `winner: "a"|"b"|null`

SwiftUI, `youSide`'a göre a/b'yi "Sen/Rakip"e eşler — aynı ContentState iki cihazda doğru perspektifle render edilir.

**`live_activity_tokens` tablosu:** `match_id uuid`, `user_id uuid`, `update_token text`, `push_to_start_token text null`, `updated_at timestamptz`, PK (match_id, user_id). RLS: owner yazar/okur; service_role hepsi.

## 4. Arayüz Tasarımı (marka dili)

**Palet (theme/colors.ts):** Sen → lime `#8FD43B` (koyu `#5C8C1E`); Rakip → court mavi `#2270BC`; metin ink `#161618`/`#65656E`; kazanan vurgu win `#5C8C1E`; aksan `#F5B924`. Kilit ekranı kartı ink koyu zemin + lime/court şeritler. **Font:** skorlar SF Pro Rounded Bold (sportif, native); app display fontu bundle edilebilirse o.

```
Dynamic Island compact:   leading 🎾      trailing 2–1   (lime–court)
Minimal:                  🎾2–1
Expanded (uzun bas):      ┌────────────────────────┐
                          │ 🎾 Maç sürüyor          │
                          │ Sen     2     40        │ lime
                          │ Rakip   1     30        │ court
                          └────────────────────────┘
Kilit ekranı kartı:       ChallengeBu! · Maç sürüyor — iki oyuncu, oyun + puan, marka şeritleri
```
Önde olan satır vurgulu; void → "Berabere · void"; finished → "Bitti · 4–1" + kazanan vurgusu.

## 5. Yaşam Döngüsü

- **Maç başlangıcı (handshake, `start.tsx`):** her oyuncu uygulamadayken kendi Live Activity'sini başlatır (`youSide` kendine göre) + `register-activity-token` ile update token'ı (+ push-to-start token) kaydeder. iOS 17.2+ ise push-to-start ile rakip uygulamada değilken bile backend başlatabilir.
- **Skorlama (`score.tsx`, sadece A):** her `award()` → A yerel `update()` + `POST relay-live-score {matchId, state}` → backend B'nin token'ına APNs liveactivity push → B'nin activity'si güncellenir.
- **Bitiş ("Maçı Bitir"/sonuç):** A yerel `end(final)`; backend B'ye final push (phase finished). Kısa "Bitti 🎾" sonrası kaybolur. Token satırları temizlenir.
- Tüm çağrılar try/catch — Live Activity / push hatası skor akışını ASLA bozmaz.

## 6. Teknik Kurulum

1. **`expo-apple-targets`** config plugin → SwiftUI Widget Extension target. **Risk:** manuel `ios/` projesi ↔ `expo prebuild` çakışması — planda cerrahi çözülecek (target'ı mevcut projeye manuel ekle veya prebuild reconcile). **En kritik entegrasyon riski.**
2. **Native modül** (Expo Modules API, Swift) — ActivityKit kontrol + token export. Paylaşılan `LiveMatchAttributes` struct modül + widget target üyeliğinde.
3. **Info.plist:** `NSSupportsLiveActivities = YES`.
4. **APNs:** `.p8` auth key (kullanıcıda var — Expo'ya yüklenmişti), key ID + team ID + bundle id `app.challengebu.ios` → Supabase **vault**'a eklenecek (dashboard SQL, kullanıcı). Edge fn ES256 JWT imzalar.
5. **Rebuild:** `npx expo run:ios --device "Hazar U." --configuration Release`. Telefonda **Dynamic Island var** → A tarafı tam test edilebilir.

## 7. Kapsam ve Non-Goals

**Dahil:** iki-cihaz canlı senkron (yerel + APNs push); Dynamic Island (compact/minimal/expanded) + kilit ekranı; başlat/güncelle/bitir; push-to-start (iOS 17.2+) + foreground fallback; token kayıt; doğrudan APNs; marka dili; desteklenmeyen cihazda no-op.
**Hariç:** çok-set/turnuva skoru; Live Activity aksiyon butonları (App Intents — yol haritası #5); Android; iki oyuncunun aynı anda skor girmesi (model tek-taraflı kalır).

## 8. Riskler

- **`expo-apple-targets` ↔ SDK 56 / RN 0.85 + manuel `ios/`** — en kritik; planda doğrulanıp cerrahi entegre edilecek.
- **Doğrudan APNs in Deno** — ES256 JWT imzalama (Web Crypto/jose), HTTP/2, liveactivity push-type başlıkları; sandbox vs production APNs (dev build → sandbox `api.sandbox.push.apple.com`).
- **Push-to-start iOS 17.2+** — kullanıcı iOS sürümü doğrulanacak; değilse foreground fallback.
- **Test sınırı:** cloud'da tek kullanıcı/cihaz. Çözüm: (a) A tarafı + UI tek cihazda tam test; (b) APNs push yolu, kendi activity token'ına push göndererek tek cihazda doğrulanır (B'yi simüle); (c) gerçek iki-cihaz görseli ikinci cihaz/hesap gerektirir — bu netleştirilecek.

## 9. Doğrulama

- A: skor ekranına gir → A'nın Island'ında skor; "+" → canlı; kilitle → kilit ekranı kartı; "Maçı Bitir" → final + kapanış.
- Push yolu: `relay-live-score` → APNs → activity güncellenir (tek cihazda kendine push ile doğrulanır).
- Graceful: Live Activities kapalı/desteklenmeyen cihazda skor akışı normal.
