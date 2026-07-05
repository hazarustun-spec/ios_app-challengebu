# Production release runbook

Cloud project: `zbjkauljjdosyuwguuhv` (Supabase). iOS bundle id: `app.challengebu.ios`,
Apple team `4MBWF4RGV7`, App Store Connect id `6785916807`.

**Durum (2026-07):** v1 özellik seti tamam. İlk submission **reddedildi** (Guideline 2.1 —
reviewer OTP girişini anlayamadı). Resubmit adımları: `docs/APP_STORE_RESUBMIT.md`.

---

## Tamamlanan prod yapılandırma

| Madde | Durum |
|-------|--------|
| Hosted Supabase URL + anon key (EAS / `.env.production`) | ✅ |
| Custom SMTP (OTP e-postası) | ✅ (operatör tarafında kurulu) |
| App Store Connect kaydı + `eas.json` ascAppId | ✅ |
| Fastlane metadata + screenshots (`apps/mobile/fastlane/`) | ✅ |
| KVKK / gizlilik / koşullar (`shimal.app/challengebu`) | ✅ |
| App Privacy JSON (`fastlane/app_privacy_details.json`) | ✅ (Fastlane `privacy` lane ile yüklenebilir) |
| `review-login` Edge Function (App Store inceleme OTP bypass) | ✅ kodda |
| Destek e-postası | `hello@shimal.app` |

---

## Resubmit öncesi kontrol listesi

### 1. App Store review girişi (kritik — red sebebi)

Uygulama **şifre kullanmaz**; yalnızca e-posta + 6 haneli OTP.

1. Hosted Supabase → Edge Functions → Secrets: **`REVIEW_OTP_CODE=424242`**
2. `review-login` fonksiyonu deploy edilmiş ve `verify_jwt = false` (bkz. `packages/supabase/config.toml`)
3. App Store Connect → App Review Information → Notes: içeriği
   `apps/mobile/fastlane/metadata/review_information/notes.txt` dosyasından yapıştır
4. Demo account alanında:
   - **Username:** `appreview42@proton.me`
   - **Password:** `424242` (6 haneli OTP — şifre değil; notlarda açıkla)
5. İnceleme hesabının onboarding'i tamamlanmış olması önerilir (tam özellik erişimi için)

### 2. Demo video (Apple'ın ikinci red maddesi)

Fiziksel iPhone'da ekran kaydı: welcome → e-posta → KVKK → OTP → onboarding (zorunlu alanlar) → ana sekmeler. Video URL'sini App Review Information → Notes alanına ekle.

### 3. APNs production host (TestFlight / App Store push)

Dev (Xcode) build'leri APNs **sandbox** kullanır; TestFlight ve App Store **production** kullanır.

Yayın build'i göndermeden önce Supabase Dashboard → SQL Editor:

```sql
-- packages/supabase/scripts/set-apns-prod-host.sql
```

⚠️ Production'a geçince Xcode dev push'u durur. Geri dönmek için host'u `https://api.sandbox.push.apple.com` yap.

### 4. EAS build + submit

Production build needs hosted Supabase env on EAS (not only local `.env.production`):

```sh
cd apps/mobile
eas env:list --environment production   # must show URL + anon key
# If empty, create once:
eas env:create production --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://zbjkauljjdosyuwguuhv.supabase.co" --visibility plaintext --non-interactive
eas env:create production --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "<anon-key-from-.env.production>" --visibility sensitive --non-interactive

eas build --profile production --platform ios
# TestFlight'ta smoke test (OTP, push, maç akışı)
eas submit --profile production --platform ios --latest
```

### 5. Fastlane App Privacy (1.7 — isteğe bağlı ama önerilir)

Apple'ın veri toplama bildirimini ASC'ye JSON'dan yükler:

```sh
cd apps/mobile
ASC_KEY_ID=... ASC_ISSUER_ID=... ASC_KEY_PATH=/path/AuthKey.p8 fastlane ios privacy
```

Gerekli: App Store Connect API key (.p8). Kod repoda; tek seferlik dashboard işi.

---

## Live Activity native extension (2.1 açıklama)

`apps/mobile/targets/live-activity/` — iOS kilit ekranı canlı skor widget'ı (WidgetKit / ActivityKit).
`app.json` → `extra.eas.build.experimental.ios.appExtensions` EAS cloud build'in extension'ı
derlemesini sağlar. Yerel `pod install` gerekmez; **EAS production build** yolu tercih edilir.

---

## Yerel native build notu (bu makine)

`docs/RELEASE.md` önceki sürümündeki CocoaPods / objectVersion 70 workaround'u hâlâ geçerli.
EAS cloud build bu sorunlardan etkilenmez.