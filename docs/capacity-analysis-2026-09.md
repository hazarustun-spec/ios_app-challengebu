# ChallengeBu Kapasite Analizi (2 Eylül 2026)

## TL;DR

- **Rahat çalışır:** ~500-800 aktif user'a kadar
- **İlk sıkıntı:** ~100 user'da (Expo Push batching yok) + ~150-200 concurrent (Realtime 200 tavanı)
- **Kritik crash:** sistem "yavaşlar", "patlamaz" — ama duyuru fan-out'u bugün bile 100+ token'da sessiz fail

## Bottleneck sırası

| # | Sorun | Vurur | Fix |
|---|-------|-------|-----|
| 1 | Expo Push tek POST'a yığıyor (100 limit) | ~100 user | `_shared/expo-push.ts:11` 100'lük chunk |
| 2 | Realtime 200 concurrent | ~100-150 aktif | Pro tier → 500 |
| 3 | Leaderboard ScrollView + unbounded profiles fetch | ~1000-2000 | FlatList + `.in()` filter |
| 4 | Messages pagination YOK | 1000+ msg thread | `.limit(50)` + reverse pagination |
| 5 | DB 500MB, messages retention yok | ~3000 user × 1 yıl | Messages cleanup cron |
| 6 | Avatar egress | ~5000 user | Bugün OK (512 JPEG normalize edildi) |

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

### P0 — Bugün bile silent fail
1. **`packages/supabase/functions/_shared/expo-push.ts:11`** — 100'lük chunk
   ```ts
   for (let i = 0; i < messages.length; i += 100) {
     await postChunk(messages.slice(i, i + 100));
   }
   ```
2. **`publish-announcement/index.ts:74`** — `notifications.insert` de chunk'la (bonus)

### P1 — 500 user hedefliyorken
3. **`hooks/use-ladder.ts:80-90`** — `public_profiles.in('user_id', [...eloIds])` filter
4. **`(tabs)/leaderboard.tsx:286+`** — ScrollView → FlatList + getItemLayout
5. **`hooks/use-messages.ts:76-88`** — `.limit(50).order(desc)` + infinite query

### P2 — 2000 user hedefliyorken
6. **Messages retention cron** — 365 gün > silinmiş, ya da 730 gün > her şey
7. **Dead-code realtime hook'ları** — `use-active-matches.ts:63`, `use-match-requests.ts:73` — sil veya kullan

## Supabase Free → Pro ne zaman

$25/ay Pro upgrade tetikleyicileri:
- **Realtime 200 → 500 concurrent** — 150+ anlık aktif user (~500-800 DAU)
- **DB 500MB → 8GB** — messages retention yoksa ~2000-3000 user'da
- **Egress 5GB → 250GB** — leaderboard viral olursa ~5000 user
- **7-günlük PITR** — production hijyeni, bugün alınabilir

**Kısa cevap:** 200-300 aktif user'ı geçince Pro. Ondan önce yukarıdaki 6 fix daha kritik.

## Genel değerlendirme

Sistem şu an güvenli. **~500 aktif user'a kadar bugünkü mimariyle rahat.** ~1000+ için virtualization + pagination. ~2000+ için retention cron + Pro. Realtime concurrent limiti anlık aktif user'a bağlı, günlük DAU'nun %10-20'si → 500-800 DAU'ya kadar rahat.

**Acil:** P0 fix (Expo Push chunk) bugün yapılmalı — silent fail riski gerçek.
