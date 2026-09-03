# Günlük Kullanım Bug + UX Audit (2 Eylül 2026)

Onay sonrası ilk hafta için gerçek user path'lerini tarayıp bulunan 19 sorun.
Öncelik: sessiz-fail temalı hatalar (yarısı ortak bir mutation-error dispatcher
ile kapanır).

Kaynak: subagent audit, task a7f525bc443c5b42f.

## Kritik (4)

1. **Mesaj gönderme sessiz fail** — `apps/mobile/app/messages/[conversationId].tsx:201` — sendMessage.mutate onError yok, blocked-user hatası kullanıcıya ulaşmıyor.
2. **Profile fetch fail → onboarding wizard** — `apps/mobile/lib/auth-bootstrap.ts:32` — network fail'de mevcut kullanıcı wizard'la üzerine yazılıyor.
3. **Retired kategori crash** — `apps/mobile/app/match/new/detail.tsx:135` — non-null assertion `.find(...)!` retired `karma_cift` state'inde TypeError.
4. **Suspended user sessiz** — `apps/mobile/stores/auth-store.ts:5` — status alanı store'a taşınmıyor.

## Yüksek (7)

5. Telefon numarası format normalize edilmiyor
6. Avatar upload hataları yutuluyor + MIME bozuk
7. Maçı Başlat error handling yok
8. Kort seçilmeden submit mümkün
9. "Mesaj" swipe aksiyonu inbox'a atıyor (thread'e değil)
10. Doubles conflict UI yanlış oyuncu gösterir
11. Avatar upload büyük dosyada OOM riski

## Orta (5)

12. Bugün + geç saat → time boşa düşer
13. "Sihirli bağlantıyı kullandım" no-op
14. Reanimated render body'de mutate
15. Profile edit tek input → çok kelimeli isim yanlış bölünür
16. Result screen'de "Skorun gönderildi" yanlış copy

## Düşük (3)

17. Default time picker seçeneklerinde yok
18. Retired karma_cift label kalıntısı
19. KVKK checkbox double-tap

## Ortak çözüm

Mutation hook'larına ortak error toast dispatcher enjekte etmek — silent-fail
temasının yarısı kapanır. `useSendMessage`, `useStartMatch`, `useConfirmMatch`,
`useRaiseDispute` şu an hiçbiri onError içermiyor.

## Deploy planı

- **Dalga 1** (2-3 saat): #1, #2, #4, #7 — silent-fail patch
- **Dalga 2** (2-3 saat): #3, #8, #5, #6, #11 — veri koruma
- **Dalga 3** (2-4 saat): #9, #10, #12-#19 — UX polish
