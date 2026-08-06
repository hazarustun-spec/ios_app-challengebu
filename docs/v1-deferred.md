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

## Onay sonrası sıradaki işler

1.1.0 build 27 ile 2026-08-06'da `WAITING_FOR_REVIEW`'a girdi. Onay çıkınca,
yukarıdaki Sentry'den sonra sırayla:

- **Review seed'ini temizle.** `packages/supabase/scripts/cleanup-review-seed-production.sql`.
  `appreview42@proton.me` hesabının sahte sıralaması, maç geçmişi ve bekleyen
  teklifi gerçek kullanıcıların sıralamasına karışmasın.

- **Ölü rozet dosyalarını sil.** `components/profile/BadgesTab.tsx` ve
  `components/profile/BadgeCard.tsx`. `BadgesTab`'i hiçbir yer import etmiyor,
  `BadgeCard`'ı da sadece o kullanıyor. İkisi hâlâ ham emoji çiziyor — ekrana
  hiç çıkmıyorlar ama "rozetler emoji" yanılgısını üreten kaynak bunlar.
  Gerçek rozet çizimi `lib/badge-art.ts`'te, 35 kodun 35'ini kapsıyor.

- **Sohbette tarih ayracı.** `app/messages/[conversationId].tsx` mesajları
  `created_at` artan sırayla diziyor ama gün ayracı yok, bu yüzden dünkü
  16:47 bugünkü 14:39'un üstünde görünüp sıralama bozukmuş izlenimi veriyor.

- **Kort görselleri.** `courts` tablosunda yalnızca `name` /
  `display_order` / `is_active` var; maç oluştururken kort seçimi düz metin
  listesi. Rakip Glass Padel'in en güçlü tarafı rezervasyon; bizde kampüs
  bağlamında rezervasyon gerekmeyebilir ama "kort neye benziyor" sorusu var.

- **Boş durum çizimleri.** `components/ui/EmptyState.tsx:77` tek bir 32px
  glif çiziyor, 22 yerde kullanılıyor — yeni kullanıcının ilk gördüğü ekran.

- **Seviye amblemleri.** `components/ui/LevelIcon.tsx:24` yedi seviyenin
  hepsinde aynı `bolt` glifini çizip yalnızca rengini değiştiriyor.

- **Paylaşım kartı arka planları.** `components/share/Card*.tsx` 1080×1920
  üretiyor ve düz beyaz; Instagram akışında silik kalıyor. Uygulamanın
  dışarıya görünen tek yüzü ve tek organik büyüme kanalı.

- **Open Çift / Karma Çift kararı.** `karma_cift` 20260805000002 ile
  kaldırıldı çünkü takım kompozisyonunu (1 erkek + 1 kadın) hiçbir kısıt
  zorlamıyordu. İleride gerçek karma istenirse kural + kategori birlikte
  gelmeli.

- **Depo temizliği.** İzlenmeyen `apps/mobile/assets/welcome-hero.png`
  (3.6 MB, kullanılmıyor) ve repo kökündeki `[archive]tennis-challenger/`
  dizini (eski kopya, `node_modules` dahil).

- **Test altyapısı.** `bun test` şu an 119 pass / 11 fail / 10 error. Kırık
  olanların hepsi `components/ui/__tests__/*` — RN 0.85 + bun `mock.module`
  named-export uyumsuzluğu ve hook kullanan bileşenlerin renderer'sız
  çağrılması. `@testing-library/react-native` hiç kurulmamış. Ayrıntı:
  `docs/postmortem.md`.

- **Maestro `screenshots.yaml`.** Sekmelere İngilizce a11y label'larıyla
  dokunuyor (`leaderboard`, `profile`, `new-match`); bunlar
  `components/ui/tab-slots.ts` ile Türkçeleşti, akış sessizce kırık.
  Çalışan sürüm: `.maestro/screenshots-prod.yaml`.

## Teknik borç (düşük öncelik)
- Analytics (PostHog)
- In-app rating prompt
- Push deep-linking gelişmiş senaryolar
- Live skor undo (server op)
- ELO history aggregated table
- Tournament admin bracket wizard