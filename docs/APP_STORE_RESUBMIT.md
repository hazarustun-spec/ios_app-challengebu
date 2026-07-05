# App Store resubmit — ChallengeBu! (1 Temmuz 2026 red)

## Red özeti

| Guideline | Sorun | Çözüm |
|-----------|--------|--------|
| 2.1 | `appreview42@proton.me` + şifre `42.42.42.42` ile giriş yapılamadı | Uygulama OTP-only; reviewer'a 6 haneli kod **424242** ve adım adım not |
| 2.1 | Demo video eksik | Fiziksel iPhone ekran kaydı + Notes'a URL |

**Neden başarısız oldu:** App Store Connect'teki "Password" alanına `42.42.42.42` yazılmış; uygulamada şifre alanı yok. Doğru kod **424242** (altı rakam, nokta yok).

---

## Senin yapman gerekenler (App Store Connect)

1. **App Review Information → Notes** — `apps/mobile/fastlane/metadata/review_information/notes.txt` içeriğini yapıştır.

2. **Sign-in information:**
   - Username: `appreview42@proton.me`
   - Password: `424242` (veya Notes'ta "N/A — use OTP 424242" yaz)

3. **Demo video** — fiziksel iPhone'da kaydet, YouTube/Vimeo/iCloud link → Notes'a ekle. Gösterilmesi gerekenler:
   - Welcome → e-posta girişi
   - KVKK onayı
   - OTP ekranı (424242)
   - Onboarding (zorunlu alanlar; telefon/foto atlanabilir)
   - Ana uygulama: sıralama, maç oluşturma veya profil

4. **Resubmit** — yeni production build yüklendikten sonra "Resubmit to App Review".

---

## Supabase (prod) — review-login

Dashboard → Project Settings → Edge Functions → Secrets:

```
REVIEW_OTP_CODE = 424242
```

Deploy:

```sh
cd packages/supabase
supabase functions deploy review-login --project-ref zbjkauljjdosyuwguuhv
```

---

## Yeni build (EAS)

```sh
cd apps/mobile
eas build --profile production --platform ios
eas submit --profile production --platform ios --latest
```

Build numarası `eas.json` production profilinde `autoIncrement: true` ile artar.

---

## Kodda yapılan iyileştirmeler

- Review e-postası için sign-in: "Devam et" + açıklayıcı metin
- OTP ekranı: "Doğrulama kodunu gir" + şifre olmadığına dair uyarı
- Maestro `review-login.yaml` — CI / lokal doğrulama