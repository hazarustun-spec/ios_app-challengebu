# ChallengeBu — v1 bilinçli ertelenenler

Bu liste `docs/roadmap/v2-backlog.md` özetidir. **Launch blocker değil** — v1.1+ için saklanıyor.

## Platform
- Android sürümü
- Dark mode (v1 için reddedildi)
- İngilizce dil desteği
- Web admin dashboard (`apps/admin-web/`)
- Home screen widget (WidgetKit)
- Website genişletme (şu an `shimal.app/challengebu` landing)

## Delight / polish
- Ses efektleri (asset gerekli)
- Genel UI polish (sürekli)

## Test / CI
- Maestro flow'ların tamamının CI'da yeşil olması (devam ediyor)
- Deno full-suite residual flake izolasyonu

## Admin
- Users ekranı zenginleştirme (bölüm, ELO, son aktif, telefon)

## Onboarding / profil (kademeli toplama)
- Kampüs / tercih edilen kort
- Hedef (rekabet / eğlence / antrenman)
- Haftalık oyun sıklığı hedefi
- Instagram / WhatsApp (opsiyonel)
- Deneyim yılı / turnuva geçmişi

## Rekabet & retention
- Lig / divizyon sistemi
- Rekabet kartı + rematch
- FOMO bildirimleri, bölüm derbisi
- Haftalık özet, re-engagement push
- Davet / referral, sosyal feed, arkadaş sistemi

## Özellik fikirleri
- Maç sonrası fotoğraf, maç silme
- Kort rezervasyon uyarısı, mascot
- Yıldız para birimi, ek rozetler / sezon ödülleri

## Monetizasyon (karar bekliyor)
- Gelir modeli (abonelik, sponsorluk, kort ortaklığı vb.)
- Veri satışı: şu an hayır (App Privacy + KVKK)

## Onay sonrası İLK iş

- **Crash reporting (Sentry).** Artık "düşük öncelikli teknik borç" değil.
  Karar (2026-08-06): App Store onayı çıkar çıkmaz kurulacak, ondan önce
  değil — şu anki tek hedef en kısa yoldan yayına çıkmak.

  Gerekçe, rakip verisinden: Glass Padel (padel, TR, Nisan 2026'da çıktı,
  4.0★ / 53 oy) — nisan-mayıs yorumlarının hepsi övgü, temmuz yorumlarının
  hepsi çökme. *"2 günde bir uygulama çöküyor"*, *"çok yavaş ve işlem
  yaparken bir anda çöküyor"*. Tek bir özellik şikâyeti yok; puanı düşüren
  şey kararlılık. Bizde crash reporting olmadığı sürece aynısı başımıza
  gelse haberimiz olmaz — ilk öğrenme yolumuz mağaza yorumları olur, ki o
  noktada puan zaten düşmüştür.

## Teknik borç (düşük öncelik)
- Analytics (PostHog)
- In-app rating prompt
- Push deep-linking gelişmiş senaryolar
- Live skor undo (server op)
- ELO history aggregated table
- Tournament admin bracket wizard