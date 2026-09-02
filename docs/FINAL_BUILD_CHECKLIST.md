# Final build checklist — App Store resubmit

Risk skorunu 6/10 → ~3/10 için bu sırayı takip et.

## A. Production backend (bir kez)

- [ ] Supabase Secrets: `REVIEW_OTP_CODE=424242`
- [ ] `supabase functions deploy review-login --project-ref zbjkauljjdosyuwguuhv`
- [ ] EAS production env (ikisi de listede):
  ```sh
  eas env:list --environment production
  ```
- [ ] Review hesabı: uygulamada bir kez `424242` ile giriş → sonra SQL:
  `packages/supabase/scripts/seed-review-account-production.sql`

## B. Son build (build 10+)

```sh
cd apps/mobile
./scripts/prepare-final-build.sh
```

Build logunda **şart**:
```
Environment variables ... loaded from the "production" environment on EAS:
EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_SUPABASE_URL
```

Submit:
```sh
eas submit --profile production --platform ios --latest
```

**Build 9 ve öncesini review'a bağlama.**

## C. TestFlight smoke test (build 10+)

- [ ] Cold launch — crash yok
- [ ] `appreview42@proton.me` → KVKK → Devam et → `424242` → ana sekmeler
- [ ] (Opsiyonel) Gerçek üniversite maili OTP
- [ ] iPad compatibility mode — launch + 1 ekran (Apple iPad test ediyor)

## D. App Store Connect

- [ ] **Build:** 1.1.0 (10+) seçili
- [ ] **Sign-in:** Username `appreview42@proton.me`, Password `424242`
- [ ] **Notes:** `apps/mobile/fastlane/metadata/review_information/notes.txt` — `DEMO_VIDEO_URL` satırına gerçek link
- [ ] **Privacy URL:** `https://shimal.app/challengebu/gizlilik.html` (Shimal astroloji `/privacy.html` değil)
- [ ] Demo video çekildi → link Notes'ta
- [ ] Resubmit to App Review + önceki red mesajına Reply

## E. Metadata (düşük öncelik, ama yap)

- [ ] Screenshot'lar build 10 UI ile güncel (6.7" + 6.5")
- [ ] Onay sonrası `shimal.app` → gerçek App Store linki