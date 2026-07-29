# Uygulama Sadeleştirme — Tasarım Dokümanı

**Tarih:** 2026-07-29
**Durum:** Onaylandı (kullanıcı) → implementation plan bekliyor
**Kapsam:** ChallengeBu! mobil (apps/mobile) — kullanım kolaylığı iyileştirmeleri

## Amaç

Uygulamanın günlük kullanımını sadeleştirmek. Kullanıcı geri bildirimiyle
belirlenen altı nokta hedefleniyor. Büyük özellik-kesme yok; navigasyon,
görünürlük ve tek bir eksik yetenek (kendi teklifini iptal) düzeltiliyor.

## Kapsam DIŞI (dokunulmayacak)

- Anasayfa (`(tabs)/index.tsx`) içeriği — mevcut hâli iyi.
- Sıralama (`(tabs)/leaderboard.tsx`) — mevcut hâli iyi.
- Onboarding akışı (11 ekran) — bu iş kapsamında değişmiyor.
- Season / tournament / badges / ranks / stats / ELO history — kaldırılmıyor,
  gizlenmiyor.
- Maçlar sayfası segment **adları** (`Yaklaşan / Teklifler / İlanlar`) — aynı
  kalıyor.

---

## Değişiklikler

### 1. Maçlar sekmesi ikonu → takvim

- **Sorun:** `components/ui/TabBar.tsx:76` `matches` sekmesi `matches`
  glyph'ini kullanıyor; bu glyph ikiye/dörde bölünmüş dikdörtgen (tablo/grid
  görünümü) — sayfayla ilişkisi belirsiz.
- **Çözüm:** Sekme ikonunu `calendar`'a çevir. `calendar` glyph'i
  `components/ui/Icon.tsx:160`'ta zaten mevcut. Tek satır değişiklik
  (`{ name: 'matches', icon: 'calendar' }`).
- **Gerekçe:** Sayfa ağırlıklı olarak yaklaşan/planlı maçları gösteriyor;
  takvim işlevi doğrudan anlatır.

### 2. Orta "+" butonu → tenis topu

- **Sorun:** TabBar orta (center) slot'u `plus` glyph'i gösteriyor
  (`TabBar.tsx:77`). Kullanıcı, açılış ekranındaki marka topunu istiyor.
- **Çözüm:** Center slot'un içeriğini `plus` yerine `BallMark` doodle'ı ile
  render et (`components/ui/doodles/BallMark.tsx` — splash'ta `size={96}`
  kullanılıyor). Tab çubuğu boyutuna uygun küçük boyut (ör. 26–30) ve
  aktif/pasif duruma göre renk (aktif: lime dolgu + ink seam; pasif: soluk).
  Merkez slot zaten `isCenter` ile özel işleniyor, davranış (tıkla →
  `/match/new/type`) değişmiyor — yalnızca glyph.
- **Not / kabul edilen ödünleşim:** "+" simgesi "yeni oluştur" niyetini daha
  net iletir; tenis topu marka dokunuşudur ve keşfedilebilirliği bir miktar
  düşürür. Kullanıcı bilinçli olarak topu seçti; uygulanıyor.
- **Uygulama detayı:** TabBar `Icon` bileşeniyle çalışıyor. İki seçenek:
  (a) center slot için özel-durum ekleyip `BallMark` render et; (b) Icon
  setine `ball` glyph'i ekleyip `icon: 'ball'` de. (a) tercih — BallMark
  zaten marka kaynağı, ikiz-bakım riski yok.

### 3. Mesajlar ikonu tüm ana sekmelerde

- **Sorun:** Mesajlar girişi yalnızca Maçlar sayfası başlığında var
  (`(tabs)/matches.tsx:203`, `mail` ikonu Segmented yanında). Diğer
  sekmelerde mesaja erişim yok → "mesajlar görünmez".
- **Çözüm:** Dört ana sekmenin (Anasayfa, Maçlar, Sıralama, Profil)
  başlığında sağ-üstte tutarlı bir `mail` ikonu + okunmamış sayısı rozeti.
  Tıkla → `/messages`.
  - Tekrarı önlemek için küçük bir paylaşılan başlık-aksiyonu bileşeni
    (ör. `components/ui/MessagesButton.tsx`) — rozet dahil — ve her sekme
    başlığına yerleştir.
- **Okunmamış rozet kaynağı:** Yeni hafif hook `useUnreadMessageCount`.
  `hooks/use-conversations.ts` her konuşma için `unreadCount` üretiyor;
  toplamı döndüren ince bir hook (veya `messages` tablosunda okunmamış
  sayımı yapan tek sorgu). `queryKeys.conversations.unreadCount()` anahtarı
  zaten ayrılmış. Notification rozetiyle (`useUnreadCount`) karıştırma —
  o `notifications` tablosu içindir.

### 4. Gönderdiğim teklifi iptal etme

- **Sorun:** `(tabs)/matches.tsx` `SentOffersList` (Gönderdiğim teklifler)
  kartları yalnızca durum etiketi gösteriyor; kullanıcı kendi gönderdiği
  bekleyen teklifi iptal edemiyor. Açık ilanlarda iptal var
  (`useDeleteOpenCall` + "İlanı sil"), direkt tekliflerde yok.
- **Çözüm:** Her gönderilen teklif kartına, **yalnızca `pending`**
  durumdayken `İptal et` (destructive) butonu. Onay Alert'i ("Teklifi geri
  çek?") → silme. Kabul/ret sonrası (pending değilse) buton görünmez.
- **Backend:** Yeni backend gerekmiyor. `useDeleteOpenCall`
  (`supabase.from('match_requests').delete().eq('id', id)`) RLS'i "kendi
  oluşturduğun `pending` kaydı sil" mantığında — tür (`direct_challenge`
  vs `open_call`) fark etmiyor; FK'ler cascade. Aynı yolu direkt teklifler
  için de kullan. **Doğrulama adımı (plan):** RLS delete politikasının
  `type`'a kısıtlı olmadığını migration'da teyit et; kısıtlıysa politikayı
  `pending` + creator olacak şekilde genişlet. Semantik netlik için hook'u
  `useCancelSentChallenge` adıyla ince bir sarmalayıcı yapabiliriz (aynı
  delete), ya da `useDeleteOpenCall`'ı doğrudan kullan.
- **Sorgu tazeleme:** İptal sonrası `matchRequests.all` ve ilgili
  giden-teklif sorgularını invalidate et (mevcut `onSuccess` deseni).

### 5. Maçlar sayfası netlik — Gelen / Gönderdiğim ayrımı

- **Sorun:** `Teklifler` segmenti hem gelen meydan okumaları hem senin
  gönderdiklerini içeriyor; ayrım zayıf. "Gönderdiğim teklifler" başlığı
  var ama gelen kısmın başlığı yok.
- **Çözüm:** `Teklifler` görünümünde iki net başlık:
  **Gelen teklifler** (accept/reject butonlu kartlar) ve
  **Gönderdiğim teklifler** (durum + yeni iptal butonu). Segment adları
  değişmiyor; yalnızca segment içi gruplama görsel olarak netleşiyor.

### 6. "Format kurallarını oku" vurgusu (maç önizleme)

- **Sorun:** `app/match/new/preview.tsx:365-399` kuralları-oku gate'i
  kaydırma gövdesinde soluk bir link; `Teklifi gönder` butonu okunana dek
  `disabled` ama kullanıcı sebebi görmüyor.
- **Çözüm:**
  - Gate'i sticky CTA'nın hemen üstüne, dikkat çekici amber/uyarı renkli bir
    karta taşı (okunmadıysa `warn` ikonu + belirgin kenarlık/dolgu).
  - Okunmadıysa metin: "⚠ Önce format kurallarını oku (zorunlu)".
  - Pasif `Teklifi gönder` butonunun altında kısa sebep satırı:
    "Göndermek için format kurallarını okumalısın."
  - Okununca kart yeşile döner ("Format kuralları okundu", `check`) ve buton
    aktifleşir. Mevcut mantık (`rulesAcknowledgedFormat === format`) korunur;
    yalnızca ranking maçlarda geçerli.

---

## Etkilenen dosyalar (öngörü)

| Alan | Dosya |
|------|-------|
| Tab ikonları | `components/ui/TabBar.tsx` (+ gerekirse `components/ui/Icon.tsx`) |
| Mesaj butonu | yeni `components/ui/MessagesButton.tsx`; `(tabs)/index.tsx`, `matches.tsx`, `leaderboard.tsx`, `profile.tsx` başlıkları |
| Unread hook | yeni `hooks/use-unread-message-count.ts` |
| Teklif iptal | `(tabs)/matches.tsx` (`SentOffersList`); yeni/mevcut delete hook; gerekirse RLS migration |
| Segment netlik | `(tabs)/matches.tsx` (Teklifler görünümü başlıkları) |
| Kural vurgusu | `app/match/new/preview.tsx` |

## Riskler / doğrulama

- **Teklif iptal RLS:** delete politikasının `direct_challenge` kayıtlarını
  da kapsadığı teyit edilecek (aksi hâlde küçük migration). Tek gerçek
  belirsizlik.
- **Merkez top ikonu keşfedilebilirlik:** "+" kadar net "oluştur" sinyali
  vermeyebilir; kullanıcı bilinçli seçti. İstenirse ileride topun üstüne
  küçük "+" rozeti eklenebilir (bu iş kapsamında değil).
- **Başlık aksiyonu tekrarı:** paylaşılan `MessagesButton` bileşeniyle her
  sekmede kod tekrarından kaçın.

## Kabul kriterleri

1. Maçlar sekmesi ikonu takvim; orta buton tenis topu.
2. Dört ana sekmenin hepsinden mesajlara ulaşılıyor; okunmamış rozet doğru.
3. Gönderdiğim bekleyen teklif iptal edilebiliyor; kabul edilmiş teklif için
   iptal görünmüyor.
4. Teklifler görünümünde Gelen/Gönderdiğim başlıkları net.
5. Önizlemede kurallar okunmadan gönder pasif; sebep ve amber uyarı görünür;
   okununca yeşile döner ve aktifleşir.
6. Kapsam dışı ekranlar değişmemiş.
