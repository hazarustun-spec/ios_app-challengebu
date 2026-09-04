# ChallengeBu Kapasite Analizi (2 Eylül 2026)

## TL;DR

- **Rahat çalışır:** ~500-800 aktif user'a kadar
- **İlk sıkıntı:** ~150-200 anlık concurrent user (Realtime 200 tavanı)
- **Kritik crash:** yok — sistem "yavaşlar", "patlamaz"

> **Düzeltme (aynı gün):** Bu raporun ilk hali "Expo Push 100 limiti bugün
> bile duyuruları sessizce düşürüyor" diyordu. Doğrulandı ve **yanlış**:
> `publish-announcement` zaten kendi 100'lük chunk'ını yapıyor
> (`publish-announcement/index.ts:102-113`), diğer üç çağıran
> (`dispatch-push`, `send-push-notification`, `send-message`) tek bir
> alıcının cihaz token'larını gönderiyor. Hiçbir çağıran limite yaklaşmıyor,
> hiç push kaybolmadı. `_shared/expo-push.ts` yine de chunk'lanacak şekilde
> güncellendi — gelecekte yazılacak bir fan-out'un aynı hatayı yeniden
> yapmasını engellemek için (defense in depth, acil değil).

## Bottleneck sırası

| # | Sorun | Vurur | Fix |
|---|-------|-------|-----|
| 1 | Realtime 200 concurrent | ~150-200 anlık aktif | Pro tier → 500 |
| 2 | Leaderboard ScrollView + unbounded profiles fetch | ~1000-2000 | FlatList + `.in()` filter |
| 3 | Messages pagination YOK | 1000+ msg thread | `.limit(50)` + reverse pagination |
| 4 | DB 500MB, messages retention yok | ~3000 user × 1 yıl | Messages cleanup cron |
| 5 | Avatar egress | ~5000 user | Bugün OK (512 JPEG normalize edildi) |
| — | ~~Expo Push chunk~~ | — | Yanlış alarmdı, yukarıdaki nota bak |

## Şu an sağlam olan yerler ✅

- Cron cleanup: notifications 30-gün, push_tokens 60-gün
- Avatar 512 JPEG normalize
- URL cache-buster upload zamanında sabitlenmiş → CDN cache çalışır
- Notifications ScrollView LIMIT 100
- Realtime debounce (`use-realtime-channel.ts:44`)
- Index'ler doğru yerlerde
- RLS filtreleri gerçek
- Cron'lar user sayısıyla lineer scale

## Kritik iyileştirmeler (öncelik sırası)

### P0 — yok
İlk raporun P0'ı (Expo Push chunk) doğrulamada düştü. Bugün acil bir şey yok.
`_shared/expo-push.ts` yine de chunk'landı, ileriye dönük koruma.

### P1 — 500-1000 user hedefliyorken
1. **`hooks/use-ladder.ts:80-90`** — `public_profiles.in('user_id', [...eloIds])` filter
2. **`(tabs)/leaderboard.tsx:286+`** — ScrollView → FlatList + getItemLayout
3. **`hooks/use-messages.ts:76-88`** — `.limit(50).order(desc)` + infinite query

### P2 — 2000 user hedefliyorken
4. **Messages retention cron** — 365 gün > silinmiş, ya da 730 gün > her şey
5. **Dead-code realtime hook'ları** — `use-active-matches.ts:63`, `use-match-requests.ts:73` — sil veya kullan
6. **Supabase Pro** — Realtime 500 concurrent + DB 8GB + PITR

## Supabase Free → Pro ne zaman

$25/ay Pro upgrade tetikleyicileri:
- **Realtime 200 → 500 concurrent** — 150+ anlık aktif user (~500-800 DAU)
- **DB 500MB → 8GB** — messages retention yoksa ~2000-3000 user'da
- **Egress 5GB → 250GB** — leaderboard viral olursa ~5000 user
- **7-günlük PITR** — production hijyeni, bugün alınabilir

**Kısa cevap:** 200-300 aktif user'ı geçince Pro. Ondan önce yukarıdaki 6 fix daha kritik.

## Genel değerlendirme

Sistem şu an güvenli. **~500 aktif user'a kadar bugünkü mimariyle rahat.** ~1000+ için virtualization + pagination. ~2000+ için retention cron + Pro. Realtime concurrent limiti anlık aktif user'a bağlı, günlük DAU'nun %10-20'si → 500-800 DAU'ya kadar rahat.

**Acil bir şey yok.** Bir sonraki gerçek eşik Realtime concurrent (~150-200 anlık
aktif user); ona yaklaşırken Pro tier + P1 listesi birlikte planlanır.
