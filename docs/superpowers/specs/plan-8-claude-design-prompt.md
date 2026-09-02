Daha önce benimle bir tenis uygulaması için tasarım dili oturttuk (renkler, tipografi, spacing, border radius, shadow, animasyon hissi, genel ton). O tasarım dilini AYNEN KORUYACAKSIN. Hiçbir tasarım kararını değiştirme, ekleme yapma, "iyileştirme" deneme — sadece aynı dili yeni ekranlara uygulayacaksın.

# Uygulama bağlamı
Adı: Tennis Challenger. üniversite mail uzantısı (example.edu.tr, std.example.edu.tr, alum.example.edu.tr, vb.) ile gating'li, üniversite öğrencileri/mezunları için tenis maç + ELO takip + sezon ladder + finale turnuva uygulaması. iOS-only (React Native + Expo). Türkçe arayüz. Maç oluştur → oyna → skor gir → rakip onayla → ELO güncellensin akışı. Sezonlar boyunca ladder yarışı, sezon sonunda 8 kişilik finale bracket'i.

# Çıktı formatı
Her ekranı **ayrı bir React + Tailwind artifact** olarak ver. Her artifact:
- iPhone 15 Pro çerçeve (393×852 pt) içinde
- Status bar dahil (9:41, batarya, sinyal)
- Gerçek Türkçe içerikle (placeholder yazma — "Aleyna Kaya", "1487 ELO", "Yarın 18:00, Kandilli Tenis Kortu" gibi)
- En üstte yorum bloğu olarak kullanılan design token'lar:
  `// Colors: primary=#xxx accent=#xxx neutral=#xxx ... // Spacing: 4/8/12/16/20/24/32 // Radius: 8/12/16 // Font: family + scale`
- Eğer dark mode tasarım dilinde varsa light + dark iki versiyon yan yana

# İş akışı
Her ekran GRUBUNU sırayla çıkar. Her gruptan sonra DUR ve "devam" yazmamı bekle. Atlama, hepsini tek seferde yapma.

# Ekran grupları

## Grup 1 — Design System Foundation
Tek artifact. Tasarım dilinin token'larını döküm halinde göster:
- Color palette: her renk için hex + token adı + nerede kullanılır (background, surface, primary text, secondary text, accent, success, warning, error)
- Typography scale: display, h1, h2, h3, body-lg, body, caption, label — her biri için font-family, size, weight, line-height, letter-spacing
- Spacing scale (4, 8, 12, 16, 20, 24, 32, 48, 64)
- Border radius scale (4, 8, 12, 16, 24, full)
- Shadow tokens (sm, md, lg, xl)
- Eğer dark mode varsa her token için dark variant
- Eğer kullandığın bir animation/transition curve varsa onu da yaz

## Grup 2 — Component Library
Tek artifact. Atomic component'ler iPhone frame içinde değil, kart kart yerleştirilmiş:
- Buttons: primary / secondary / destructive / ghost — default, hover/pressed, disabled, loading
- Inputs: text, email, password, search, with-leading-icon, hata state
- Radio group, checkbox, toggle switch, segmented control
- Card: default + interactive (basılabilir) + elevated
- Modal + bottom sheet
- Toast / inline banner (info, success, warning, error)
- Tab bar (4 sekme: Anasayfa, Maçlar, Lig, Profil)
- Avatar (sm/md/lg + initials fallback)
- ELO badge / rating chip (sayı + trend ok)
- Match card (planlı, skor bekleyen, tamamlanmış varyantları)
- Player chip / mini-card (avatar + isim + ELO yan yana)

## Grup 3 — Auth & Onboarding (12 ekran)
1. Splash (logo + slogan + "Giriş yap" CTA)
2. Mail giriş (üniversite mail validasyonu, hata state)
3. Magic link gönderildi (mail check ekranı + "tekrar gönder" countdown)
4. Onboarding 1/10: Ad, Soyad
5. 2/10: Bölüm (autocomplete liste)
6. 3/10: Sınıf (1, 2, 3, 4, mezun, yüksek lisans, doktora)
7. 4/10: Cinsiyet kategorisi (erkek / kadın / open)
8. 5/10: Skill self-assessment (başlangıç / orta / ileri)
9. 6/10: Dominant el (sağ / sol)
10. 7/10: Müsaitlik (hafta içi sabah/öğlen/akşam, hafta sonu — multi-select grid)
11. 8/10: Profil fotoğrafı (yükle / atla)
12. 9/10: KVKK + gizlilik onayı (uzun metin scrollable + checkbox)
13. 10/10: Bildirim izni (resim + "izin ver" + "şimdi değil")
14. Tamamlandı / hoş geldin

## Grup 4 — Anasayfa + Tabs
1. Tab bar (4 sekme, aktif sekme vurgusu, badge sayacı)
2. Anasayfa: greeting + ELO kartı (trend grafiği mini) + "Yeni Maç" CTA + Aktif Maçlar listesi (2-3 kart) + Son Sonuçlar (1-2 kart) + Sezon banner (kalan gün)

## Grup 5 — Maçlar akışı
1. Maç listesi (3 filter tab: Aktif / Planlı / Tamamlanmış)
2. Maç oluştur — direct challenge (rakip seç + tarih + lokasyon + format: 2 set / 3 set / pro set)
3. Maç oluştur — open call (tarih + lokasyon + format + "Kim katılabilir": tüm seviyeler / yakın seviye / sadece davetli)
4. Maç detayı (rakipler + tarih + lokasyon + status badge + akıllı CTA: "Skoru gir" / "Onayla" / "İtiraz et")
5. Skor giriş (set-by-set, tiebreak +1, golden point varyantı)
6. Skor onayı (rakip onaylama ekranı: skor gösterimi + Onayla / İtiraz et)
7. Maç tamamlandı (skor + ELO değişimi animasyonlu sayı + "Paylaş" + "Tekrar oyna" CTA)
8. İtiraz oluştur (sebep dropdown + detay textarea + kanıt foto yükle)

## Grup 6 — Profil
1. Kendi profilim (avatar + isim + ELO + bölüm + en yüksek ELO + W/L sayacı + 3 vitrin rozeti + "Maç geçmişi" + "ELO grafiği" CTA'ları)
2. Başka oyuncu profili (kendi profil görünümünün okuma-only versiyonu + "Meydan Oku" CTA)
3. Profil düzenle (avatar değiştir + müsaitlik + skill + dominant el alanları)
4. ELO grafik (haftalık / aylık / sezon segmented control + line chart + son maçlar listesi)
5. Rozetler (kazanılanlar grid + kazanılmamışlar grayed lock'lu, kategori filtresi)
6. Vitrin seçici (3 rozet seç modal)

## Grup 7 — Sezon + Turnuva
1. Sezon ladder (top 50 + kullanıcının kendi satırı sticky + erkek/kadın/open filter)
2. Sezon detay (tarih aralığı + kalan gün + kayıt durumu + "Finale bracket" CTA)
3. Finale Bracket — tekler (8 kişilik bracket ağaç görsel, scroll edilebilir)
4. Finale Bracket — doubles (4 takım bracket, her slot iki oyuncu)
5. Yıllık şampiyonluk (kazanan büyük + finalist + yarı finalistler grid)

## Grup 8 — Bildirimler + Ayarlar
1. Bildirim merkezi (kategorize liste, okundu/okunmadı vurgusu, swipe-to-delete)
2. Bildirim ayarları (8 kategori toggle: Maç davetleri, Skor onay bekleyen, Rozetler, Sezon olayları, İtiraz güncellemeleri, Ladder hareketi, Topluluk duyuruları, Çiftler davetleri)
3. Ayarlar ana ekran (Profil düzenle, Bildirim ayarları, KVKK, Gizlilik, Çıkış, Hesabı sil)
4. Hesabı sil onay modal (uyarı + 7 gün geri alma penceresi açıklaması)

## Grup 9 — Admin (6 ekran)
1. Admin dashboard (6 tile: İtirazlar, Sezon, Bracket, Kullanıcılar, Duyurular, Sistem)
2. Bekleyen İtirazlar listesi + detay
3. Sezon Yönetimi (sezon kapat, finale başlat butonları + sezon listesi)
4. Bracket Yönetimi (maç void etme dialog + manuel sonuç girme)
5. Kullanıcı Yönetimi listesi + detay (role/status değiştirme + audit log)
6. Duyurular (yayınla form + geçmiş listesi)
7. Sistem Sağlığı (cron statusları + audit log feed)

## Grup 10 — States
1. Skeleton loaders — Anasayfa, Maçlar listesi, Profil, Ladder için
2. Empty states — "Henüz maç yok" + CTA, "Henüz rozet yok", "Henüz bildirim yok" (illustrasyon emoji + tek-renk SVG yeterli)
3. Error states — Network, 500, auth expired
4. Pull-to-refresh göstergesi

## Grup 11 — Share Cards (Instagram story 1080×1920)
1. Maç sonucu kartı (kazanan + skor + ELO değişimi + Tennis Challenger logo footer)
2. ELO progress kartı (haftalık değişim grafiği + Tennis Challenger logo)
3. Rozet kazanıldı kartı (rozet ikonu büyük + isim + açıklama + Tennis Challenger logo)

# Önemli kurallar
- Mevcut tasarım dilini AYNEN KORU. Renk, tipografi, spacing, radius, shadow, animasyon — hiçbir karar değişmeyecek.
- Tüm mikrocopy Türkçe ve gerçekçi. Genç üniversiteli kitleye uygun ton (samimi ama profesyonel).
- Her artifact'in en üstüne kullanılan token'ları yorum olarak yaz.
- Karmaşık illustration üretme — emoji veya tek-renk SVG yeterli.
- Her gruptan sonra DUR, "devam" yazmamı bekle.

Grup 1'den başla.
