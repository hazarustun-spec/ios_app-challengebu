# Uygulama Sadeleştirme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ChallengeBu! mobil uygulamasında altı hedefli kullanılabilirlik düzeltmesi yapmak — tab ikonları, her sekmeden mesajlara erişim, gönderilen teklifi iptal, Teklifler görünümünde Gelen/Gönderdiğim ayrımı ve maç önizlemesinde "format kurallarını oku" kapısının görünürlüğü.

**Architecture:** Değişen her kural saf (react-native import etmeyen) bir modüle çıkarılır — `components/ui/tab-slots.ts`, `lib/match-request-rules.ts`, `lib/rules-gate.ts` — böylece `bun test` altında gerçekten çalışan birim testleri yazılabilir. Ekranlar bu saf modülleri tüketir; JSX/yerleşim değişiklikleri `npx tsc --noEmit` ve cihazda elle doğrulanır. Mevcut satır içi mesaj butonu paylaşılan `MessagesButton` bileşenine çıkarılır ve `NavHeader`'a eklenen opsiyonel `rightSlot` yuvasıyla dört sekmeye dağıtılır.

**Tech Stack:** Expo SDK 56 / React Native 0.85 / React 19, Expo Router, TypeScript, NativeWind, Zustand, TanStack Query, Supabase (Postgres + RLS), `bun test` (bun 1.3.14), Biome.

## Global Constraints

- Çalışma dizini: `/Users/hazarustun/Developer/[ios_app]tennis-challenger/apps/mobile`. Tüm komutlar bu dizinden çalıştırılır.
- `bun` PATH'te olmayabilir; her zaman tam yol kullan: `/opt/homebrew/bin/bun`.
- Typecheck komutu: `npx tsc --noEmit` — her task'ın sonunda exit 0 vermeli.
- **Baseline test durumu: 72 pass / 11 fail / 10 error.** Bu kırıklar önceden var (RN 0.85 + bun `mock.module` named-export uyumsuzluğu). Bir task'tan sonra pass sayısı artmalı, fail/error sayısı **artmamalı**. Bu kırık dosyaları onarmak bu planın kapsamı DIŞINDA.
- `components/ui/__tests__/Nav.test.tsx` bilinen-kırık (0 pass). Dokunma.
- Yeni saf modüller (`tab-slots.ts`, `match-request-rules.ts`, `rules-gate.ts`) **react-native, expo veya react-native-svg'den runtime import ETMEMELİ**. Yalnızca `import type { ... }` (tip importları derlemede silinir) serbesttir. Bu kural testlerin çalışabilmesinin tek sebebi.
- Arayüz metinleri Türkçe. Mevcut ton korunur.
- Renk sabitleri `theme/colors.ts`'ten gelir; hex kodu satır içine yazma.
- Kapsam dışı, dokunulmayacak: onboarding akışı, Sıralama ekranının içeriği, Anasayfa içerik kartları, season/tournament/badges/ranks/stats ekranları, Maçlar segment **etiketleri** (`Yaklaşan` / `Teklifler` / `İlanlar` aynı kalır).
- Veritabanı migration'ı YOK. Gerekli RLS politikası zaten mevcut ve doğrulandı.

---

## File Structure

| Dosya | Sorumluluk | Durum |
|-------|-----------|-------|
| `components/ui/tab-slots.ts` | Tab çubuğu yuva konfigürasyonu (sıra, ikon adı, merkez işareti). Saf veri. | Yeni |
| `components/ui/__tests__/tab-slots.test.ts` | Yuva konfigürasyonunun testi. | Yeni |
| `components/ui/TabBar.tsx` | Yuva konfigürasyonunu render eder; merkez yuvada `BallMark` çizer. | Değişir |
| `components/ui/MessagesButton.tsx` | Rozetli mesaj butonu — okunmamış sayısını çeker, `/messages`'a gider. | Yeni |
| `components/ui/NavHeader.tsx` | Başlık; `actionIcon`'un soluna opsiyonel `rightSlot` düğümü basar. | Değişir |
| `components/ui/GreetHeader.tsx` | Anasayfa selamlama başlığı; zilin soluna opsiyonel `leftOfBell` düğümü basar. | Değişir |
| `lib/match-request-rules.ts` | `canCancelSentOffer(row, myUserId)` — iptal edilebilirlik kuralı (RLS'i aynalar). Saf. | Yeni |
| `lib/__tests__/match-request-rules.test.ts` | İptal kuralının testi. | Yeni |
| `hooks/use-delete-match-request.ts` | `pending` bir `match_requests` satırını id ile siler + cache invalidate. | Yeni |
| `hooks/use-delete-open-call.ts` | Yukarıdakine tek satırlık delege (mevcut çağıranlar bozulmasın). | Değişir |
| `lib/rules-gate.ts` | `rulesGateState(kind, format, acknowledgedFormat)` → `'not-required' \| 'unread' \| 'read'`. Saf. | Yeni |
| `lib/__tests__/rules-gate.test.ts` | Kural kapısı durumunun testi. | Yeni |
| `app/(tabs)/matches.tsx` | Satır içi mesaj butonu yerine `MessagesButton`; Gelen/Gönderdiğim başlıkları; gönderilen teklifte iptal butonu. | Değişir |
| `app/(tabs)/leaderboard.tsx` | `NavHeader`'a `rightSlot={<MessagesButton />}`. | Değişir |
| `app/(tabs)/profile.tsx` | `NavHeader`'a `rightSlot={<MessagesButton />}`. | Değişir |
| `app/(tabs)/index.tsx` | `GreetHeader`'a `leftOfBell={<MessagesButton />}`. | Değişir |
| `app/match/new/preview.tsx` | Kural kapısını CTA'nın üstüne taşır, amber uyarı + sebep satırı. | Değişir |

---

## Task 1: Tab yuvası konfigürasyonu + ikon değişiklikleri

Maçlar sekmesi ikonunu takvime, merkez "+" butonunu tenis topuna çevirir. Yuva
konfigürasyonu saf bir modüle taşınır ki test edilebilsin (`TabBar.tsx`'in
kendisi hook kullandığı için mevcut test deseniyle render edilemiyor).

**Files:**
- Create: `apps/mobile/components/ui/tab-slots.ts`
- Create: `apps/mobile/components/ui/__tests__/tab-slots.test.ts`
- Modify: `apps/mobile/components/ui/TabBar.tsx` (66-80 yuva tanımı, 95-156 `TabSlot`)

**Interfaces:**
- Consumes: `IconName` tipi (`components/ui/Icon.tsx`), `BallMark` bileşeni (`components/ui/doodles/BallMark.tsx`, props: `size?: number; color?: string; stroke?: string; sw?: number`).
- Produces:
  - `export interface TabSlotConfig { name: string; icon?: IconName; isCenter?: boolean }`
  - `export const TAB_SLOTS: TabSlotConfig[]`
  - Bu isimler Task 1 dışında kullanılmıyor; sadece `TabBar.tsx` tüketir.

- [ ] **Step 1: Yuva konfigürasyonu için başarısız testi yaz**

`apps/mobile/components/ui/__tests__/tab-slots.test.ts` oluştur:

```ts
// Tab slot configuration tests.
//
// `TabBar.tsx` itself uses React hooks (useRef/useEffect/useSharedValue), so
// the repo's direct-invocation snapshot pattern cannot render it. The slot
// configuration — which is what the icon work actually changes — lives in a
// pure module so it can be asserted directly.

import { describe, expect, test } from 'bun:test';
import { TAB_SLOTS } from '../tab-slots';

describe('TAB_SLOTS', () => {
  test('declares the five tab slots in design order', () => {
    expect(TAB_SLOTS.map((s) => s.name)).toEqual([
      'index',
      'matches',
      'new-match',
      'leaderboard',
      'profile',
    ]);
  });

  test('matches tab uses the calendar glyph', () => {
    const matches = TAB_SLOTS.find((s) => s.name === 'matches');
    expect(matches?.icon).toBe('calendar');
  });

  test('center slot renders the ball mark, not an Icon glyph', () => {
    const center = TAB_SLOTS.find((s) => s.isCenter);
    expect(center?.name).toBe('new-match');
    // `icon` is intentionally absent — TabSlot draws BallMark for the center.
    expect(center?.icon).toBeUndefined();
  });

  test('exactly one slot is the center slot', () => {
    expect(TAB_SLOTS.filter((s) => s.isCenter).length).toBe(1);
  });

  test('every non-center slot declares an icon', () => {
    for (const slot of TAB_SLOTS.filter((s) => !s.isCenter)) {
      expect(slot.icon).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Çalıştır:
```bash
cd apps/mobile && /opt/homebrew/bin/bun test components/ui/__tests__/tab-slots.test.ts
```
Beklenen: FAIL — `Cannot find module '../tab-slots'`.

- [ ] **Step 3: Saf yuva modülünü yaz**

`apps/mobile/components/ui/tab-slots.ts` oluştur:

```ts
// Tab bar slot configuration.
//
// Extracted from TabBar.tsx so the slot order + glyph choices are assertable
// in `bun test` — TabBar itself uses hooks and cannot be invoked directly
// under the repo's renderer-free test pattern.
//
// IMPORTANT: this module must stay free of runtime react-native / expo
// imports. `IconName` is a type-only import and is erased at compile time,
// which is what keeps this file loadable under bun:test.

import type { IconName } from './Icon';

export interface TabSlotConfig {
  /** Expo Router screen name. Must match the file inside `app/(tabs)/`. */
  name: string;
  /**
   * Glyph for a normal slot. Omitted for the center slot, which renders the
   * BallMark doodle instead of an Icon glyph.
   */
  icon?: IconName;
  /** Central action button — visually dominant, never persists as active. */
  isCenter?: boolean;
}

export const TAB_SLOTS: TabSlotConfig[] = [
  { name: 'index', icon: 'home' }, // Anasayfa (landing)
  { name: 'matches', icon: 'calendar' }, // Maçlar — upcoming/planned matches
  { name: 'new-match', isCenter: true }, // "+" slot → BallMark
  { name: 'leaderboard', icon: 'ranking' }, // Sıralama
  { name: 'profile', icon: 'user' },
];
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Çalıştır:
```bash
cd apps/mobile && /opt/homebrew/bin/bun test components/ui/__tests__/tab-slots.test.ts
```
Beklenen: PASS — 5 pass, 0 fail.

- [ ] **Step 5: TabBar'ı yeni konfigürasyonu ve BallMark'ı kullanacak şekilde güncelle**

`apps/mobile/components/ui/TabBar.tsx` içinde:

(a) `Icon` importunun altına BallMark ve yuva konfigürasyonu importlarını ekle. Mevcut satır 33 (`import { Icon, type IconName } from './Icon';`) şununla değiştir:

```ts
import { Icon } from './Icon';
import { BallMark } from './doodles/BallMark';
import { TAB_SLOTS, type TabSlotConfig } from './tab-slots';
```

(b) Yerel `SlotConfig` arayüzünü ve `SLOTS` dizisini (mevcut 66-80 satırları) tamamen sil — artık `tab-slots.ts`'ten geliyorlar. Yerine hiçbir şey koyma; `SLOT_SIZE` sabiti (satır 82) kalır.

(c) `TabSlotProps` içindeki `slot: SlotConfig;` alanını şununla değiştir:

```ts
  slot: TabSlotConfig;
```

(d) `TabSlot` içindeki glyph render'ını değiştir. Mevcut blok:

```tsx
      <Animated.View style={iconStyle}>
        <Icon
          name={slot.icon}
          size={isCenter ? 25 : 23}
          color="#FFFFFF"
          stroke={isCenter ? 2.7 : isActive ? 2.4 : 2.1}
        />
      </Animated.View>
```

şununla değiştir:

```tsx
      <Animated.View style={iconStyle}>
        {isCenter ? (
          // Brand mark instead of a "+" glyph. White seams read against the
          // court-blue center button the same way the white "+" stroke did.
          <BallMark size={28} color={colors.lime} stroke="#FFFFFF" sw={3.6} />
        ) : (
          <Icon
            name={slot.icon ?? 'home'}
            size={23}
            color="#FFFFFF"
            stroke={isActive ? 2.4 : 2.1}
          />
        )}
      </Animated.View>
```

(e) Render gövdesindeki `SLOTS.map(...)` çağrısını `TAB_SLOTS.map(...)` yap (mevcut satır 223).

- [ ] **Step 6: Testleri ve typecheck'i çalıştır**

Çalıştır:
```bash
cd apps/mobile && /opt/homebrew/bin/bun test components/ui/__tests__/tab-slots.test.ts && npx tsc --noEmit && echo "TYPECHECK OK"
```
Beklenen: 5 pass, 0 fail; ardından `TYPECHECK OK`.

- [ ] **Step 7: Suite regresyon kontrolü**

Çalıştır:
```bash
cd apps/mobile && /opt/homebrew/bin/bun test 2>&1 | tail -5
```
Beklenen: **77 pass** (72 baseline + 5 yeni), fail sayısı 11'i, error sayısı 10'u **aşmamalı**. Aşıyorsa değişikliği geri al ve nedenini bul.

- [ ] **Step 8: Commit**

```bash
cd /Users/hazarustun/Developer/\[ios_app\]tennis-challenger
git add apps/mobile/components/ui/tab-slots.ts apps/mobile/components/ui/__tests__/tab-slots.test.ts apps/mobile/components/ui/TabBar.tsx
git commit -m "feat(tabs): calendar glyph for Maçlar, ball mark for the center button

Extracts the tab slot configuration into a pure module so the glyph choices
are covered by a test that can actually run — TabBar uses hooks and cannot be
invoked under the repo's renderer-free snapshot pattern.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Paylaşılan MessagesButton + dört sekmeye dağıtım

Rozetli mesaj butonu bugün yalnızca `matches.tsx` içinde satır içi yazılı.
Paylaşılan bir bileşene çıkarılıp dört ana sekmenin başlığına konur.

**Files:**
- Create: `apps/mobile/components/ui/MessagesButton.tsx`
- Modify: `apps/mobile/components/ui/NavHeader.tsx` (props arayüzü + sağ aksiyon bölgesi)
- Modify: `apps/mobile/components/ui/GreetHeader.tsx` (zilin soluna yuva)
- Modify: `apps/mobile/app/(tabs)/matches.tsx` (satır içi butonu değiştir)
- Modify: `apps/mobile/app/(tabs)/leaderboard.tsx` (~228-238 `NavHeader`)
- Modify: `apps/mobile/app/(tabs)/profile.tsx` (~148-152 `NavHeader`)
- Modify: `apps/mobile/app/(tabs)/index.tsx` (~261-266 ve ~292-297 `GreetHeader` çağrıları)

**Interfaces:**
- Consumes: `useUnreadMessageCount()` (`hooks/use-conversations.ts:113`) — `useQuery<number>` döner, `.data` `number | undefined`.
- Produces:
  - `export function MessagesButton(): JSX.Element` — props almaz; kendi verisini çeker ve `/messages`'a gider.
  - `NavHeaderProps.rightSlot?: ReactNode`
  - `GreetHeaderProps.leftOfBell?: ReactNode`

- [ ] **Step 1: MessagesButton bileşenini oluştur**

Bu bileşenin otomatik testi yok — hook kullanıyor ve depodaki render-suz test
deseni hook'lu bileşenleri çağıramıyor (bkz. Global Constraints). Doğrulama
typecheck + cihazda gözle yapılır.

`apps/mobile/components/ui/MessagesButton.tsx` oluştur:

```tsx
// MessagesButton — header action that opens the conversation list.
//
// Extracted verbatim from the inline button that used to live only in
// `app/(tabs)/matches.tsx`, so every main tab can surface messages with the
// same 40×40 surface-2 chip + unread pip. The badge count comes from
// `useUnreadMessageCount` (the `unread_message_count` RPC) — NOT from
// `useUnreadCount`, which counts notifications.

import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Icon } from './Icon';
import { useUnreadMessageCount } from '../../hooks/use-conversations';
import { colors } from '../../theme/colors';

export function MessagesButton() {
  const { data: unread = 0 } = useUnreadMessageCount();

  return (
    <Pressable
      onPress={() => router.push('/messages' as never)}
      accessibilityRole="button"
      accessibilityLabel="Mesajlar"
      style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: colors.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="mail" size={20} color={colors.text} />
      {unread > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -5,
            minWidth: 17,
            height: 17,
            paddingHorizontal: 4,
            borderRadius: 8.5,
            backgroundColor: colors.pinkDeep,
            borderWidth: 1.5,
            borderColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
```

- [ ] **Step 2: NavHeader'a `rightSlot` ekle**

`apps/mobile/components/ui/NavHeader.tsx`:

(a) Dosyanın en üstündeki import'lara React tip importunu ekle (zaten varsa tekrarlama):

```ts
import type { ReactNode } from 'react';
```

(b) `NavHeaderProps` arayüzüne, `large?: boolean;` alanının hemen üstüne ekle:

```ts
  /**
   * Extra element rendered immediately to the LEFT of the `actionIcon` chip.
   * Exists because every main tab already spends the single `actionIcon` slot
   * (matches→clock, leaderboard→filter, profile→settings) and still needs a
   * messages entry point.
   */
  rightSlot?: ReactNode;
```

(c) Bileşenin destructure listesine `rightSlot,` ekle — `onAction,` ile `large,` arasına (mevcut 51-52 satırları):

```ts
  onAction,
  rightSlot,
  large,
```

(d) Sarmalayıcı View'a gerek YOK: dış satır zaten `className="flex-row items-center gap-2.5 min-h-[48px]"` (satır 61), yani `rightSlot` doğrudan kardeş olarak eklenir. `{actionIcon && (` ile başlayan bloğun (mevcut satır 140) hemen ÜSTÜNE ekle:

```tsx
        {rightSlot}
```

(e) Ortalanmış başlığı dengeleyen boşluk koşulunu güncelle (mevcut satır 160) — `rightSlot` varken boşluk basılmamalı:

```tsx
        {!onBack && !large && !action && !actionIcon && !rightSlot && (
```

- [ ] **Step 3: GreetHeader'a `leftOfBell` ekle**

`apps/mobile/components/ui/GreetHeader.tsx`:

(a) Import ekle:

```ts
import type { ReactNode } from 'react';
```

(b) `GreetHeaderProps`'a ekle:

```ts
  /** Extra element rendered immediately to the left of the bell. */
  leftOfBell?: ReactNode;
```

(c) Destructure listesine `leftOfBell,` ekle.

(d) Zil `Pressable`'ını (mevcut 79-87 satırları) bir satır kapsayıcıyla sar:

```tsx
      <View className="flex-row items-center" style={{ gap: 6 }}>
        {leftOfBell}
        <Pressable
          onPress={onBellPress}
          className="items-center justify-center"
          style={{ width: 44, height: 44, marginRight: -8 }}
          accessibilityRole="button"
          accessibilityLabel="Bildirimler"
        >
          <BellWithBadge count={unreadCount} />
        </Pressable>
      </View>
```

- [ ] **Step 4: matches.tsx'teki satır içi butonu MessagesButton ile değiştir**

`apps/mobile/app/(tabs)/matches.tsx`:

(a) Import ekle (diğer `components/ui` importlarının yanına):

```ts
import { MessagesButton } from '../../components/ui/MessagesButton';
```

(b) 202-244 satırlarındaki tüm satır içi `<Pressable ...>...</Pressable>` mesaj butonu bloğunu şununla değiştir:

```tsx
        <MessagesButton />
```

(c) Artık kullanılmayan yerel satırı sil (mevcut satır 158):

```ts
  const { data: unreadMessages = 0 } = useUnreadMessageCount();
```

(d) `useUnreadMessageCount` importunu sil (mevcut satır 42) — başka kullanımı kalmıyor.

- [ ] **Step 5: Diğer üç sekmeye butonu ekle**

(a) `apps/mobile/app/(tabs)/leaderboard.tsx` — import ekle:

```ts
import { MessagesButton } from '../../components/ui/MessagesButton';
```

`NavHeader` çağrısına (~228) prop ekle:

```tsx
        rightSlot={<MessagesButton />}
```

(b) `apps/mobile/app/(tabs)/profile.tsx` — aynı importu ekle ve `NavHeader` çağrısına (~148) aynı `rightSlot` prop'unu ekle.

(c) `apps/mobile/app/(tabs)/index.tsx` — aynı importu ekle. **Her iki** `GreetHeader` çağrısına (~261 ve ~292) ekle:

```tsx
          leftOfBell={<MessagesButton />}
```

- [ ] **Step 6: Typecheck ve suite regresyonu**

Çalıştır:
```bash
cd apps/mobile && npx tsc --noEmit && echo "TYPECHECK OK" && /opt/homebrew/bin/bun test 2>&1 | tail -5
```
Beklenen: `TYPECHECK OK`; test sonucu Task 1 sonrasıyla aynı (77 pass, fail ≤ 11, error ≤ 10).

- [ ] **Step 7: Commit**

```bash
cd /Users/hazarustun/Developer/\[ios_app\]tennis-challenger
git add apps/mobile/components/ui/MessagesButton.tsx apps/mobile/components/ui/NavHeader.tsx apps/mobile/components/ui/GreetHeader.tsx apps/mobile/app/\(tabs\)/
git commit -m "feat(messages): surface the messages button on every main tab

Extracts the badged button that only existed in the Maçlar header into a
shared MessagesButton and gives NavHeader/GreetHeader a slot for it, since
each tab already spends its single action icon.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Gönderilen teklifi iptal etme

Kullanıcı kendi gönderdiği ve henüz yanıtlanmamış meydan okumayı geri
çekebilmeli. Veritabanı tarafı hazır: `20260619000004_match_request_creator_delete.sql`
`using (auth.uid() = creator_id and status = 'pending')` politikasını
tanımlıyor ve `type` sütununa kısıtlı değil. Migration YOK.

**Files:**
- Create: `apps/mobile/lib/match-request-rules.ts`
- Create: `apps/mobile/lib/__tests__/match-request-rules.test.ts`
- Create: `apps/mobile/hooks/use-delete-match-request.ts`
- Modify: `apps/mobile/hooks/use-delete-open-call.ts` (delegasyona indir)
- Modify: `apps/mobile/app/(tabs)/matches.tsx` (`SentOffersList`, ~835-935)

**Interfaces:**
- Consumes: `MatchRequestRow` (`hooks/use-match-requests.ts:9`) — alanları: `id`, `creator_id`, `target_id`, `type`, `status`, `target_profile`, `court`, vb. `useAuthStore` (`stores/auth-store.ts`) — `state.user?.id`.
- Produces:
  - `export function canCancelSentOffer(row: CancelableRequest, myUserId: string | undefined): boolean`
  - `export interface CancelableRequest { creator_id: string; status: string }`
  - `export function useDeleteMatchRequest(): UseMutationResult<void, Error, string>` — `mutate(requestId)`.
  - `useDeleteOpenCall` adı korunur (aynı hook'a delege).

- [ ] **Step 1: İptal kuralı için başarısız testi yaz**

`apps/mobile/lib/__tests__/match-request-rules.test.ts` oluştur:

```ts
// Cancel-eligibility rule tests.
//
// This predicate mirrors the RLS policy in
// `20260619000004_match_request_creator_delete.sql`:
//   using (auth.uid() = creator_id and status = 'pending')
// Keeping the client rule in a pure module means the UI never offers a
// cancel button for a row the database would refuse to delete.

import { describe, expect, test } from 'bun:test';
import { canCancelSentOffer } from '../match-request-rules';

const ME = 'user-me';

describe('canCancelSentOffer', () => {
  test('allows cancelling my own pending request', () => {
    expect(canCancelSentOffer({ creator_id: ME, status: 'pending' }, ME)).toBe(true);
  });

  test('refuses once the request is accepted', () => {
    expect(canCancelSentOffer({ creator_id: ME, status: 'accepted' }, ME)).toBe(false);
  });

  test('refuses rejected, expired and completed requests', () => {
    for (const status of ['rejected', 'expired', 'completed']) {
      expect(canCancelSentOffer({ creator_id: ME, status }, ME)).toBe(false);
    }
  });

  test('refuses a pending request created by someone else', () => {
    expect(canCancelSentOffer({ creator_id: 'user-other', status: 'pending' }, ME)).toBe(false);
  });

  test('refuses when the current user is unknown', () => {
    expect(canCancelSentOffer({ creator_id: ME, status: 'pending' }, undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Çalıştır:
```bash
cd apps/mobile && /opt/homebrew/bin/bun test lib/__tests__/match-request-rules.test.ts
```
Beklenen: FAIL — `Cannot find module '../match-request-rules'`.

- [ ] **Step 3: Kuralı yaz**

`apps/mobile/lib/match-request-rules.ts` oluştur:

```ts
// Client-side mirror of the match_requests delete policy.
//
// Source of truth: packages/supabase/migrations/
//   20260619000004_match_request_creator_delete.sql
//     create policy "Creator can delete own pending request"
//       on public.match_requests for delete to authenticated
//       using (auth.uid() = creator_id and status = 'pending');
//
// The policy is NOT restricted by `type`, so direct challenges are
// cancelable by their creator exactly like open calls.
//
// Pure module — no react-native / expo imports, so it stays testable.

export interface CancelableRequest {
  creator_id: string;
  status: string;
}

export function canCancelSentOffer(
  row: CancelableRequest,
  myUserId: string | undefined,
): boolean {
  if (!myUserId) return false;
  return row.creator_id === myUserId && row.status === 'pending';
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Çalıştır:
```bash
cd apps/mobile && /opt/homebrew/bin/bun test lib/__tests__/match-request-rules.test.ts
```
Beklenen: PASS — 5 pass, 0 fail.

- [ ] **Step 5: Genel silme hook'unu oluştur**

`apps/mobile/hooks/use-delete-match-request.ts` oluştur:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

/**
 * Delete a pending `match_requests` row the current user created — either an
 * open call or a direct challenge. RLS enforces creator + `pending`
 * (20260619000004_match_request_creator_delete.sql); FKs cascade so
 * applications and any attached chat go with it.
 */
export function useDeleteMatchRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('match_requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.openCalls.all });
      qc.invalidateQueries({ queryKey: queryKeys.matchRequests.all });
    },
  });
}
```

- [ ] **Step 6: use-delete-open-call.ts'i delegasyona indir**

`apps/mobile/hooks/use-delete-open-call.ts` dosyasının TÜM içeriğini şununla değiştir:

```ts
// Kept as a named alias so existing call sites (matches.tsx FeedList) keep
// reading naturally. The underlying delete is type-agnostic — see
// hooks/use-delete-match-request.ts.
export { useDeleteMatchRequest as useDeleteOpenCall } from './use-delete-match-request';
```

- [ ] **Step 7: SentOffersList'e iptal butonunu ekle**

`apps/mobile/app/(tabs)/matches.tsx`:

(a) Importları ekle (mevcut import bloğuna):

```ts
import { useDeleteMatchRequest } from '../../hooks/use-delete-match-request';
import { canCancelSentOffer } from '../../lib/match-request-rules';
import { useAuthStore } from '../../stores/auth-store';
```

(b) `SentOffersList` fonksiyonunun gövdesinin başına (mevcut `const sent = ...` satırının ÜSTÜNE) ekle:

```tsx
  const toast = useToast();
  const myUserId = useAuthStore((s) => s.user?.id);
  const cancelRequest = useDeleteMatchRequest();
```

(c) `sent.map((m) => {` bloğunun içinde, `const status = SENT_STATUS[m.status] ?? {...}` tanımının hemen ALTINA ekle:

```tsx
        const cancelable = canCancelSentOffer(m, myUserId);
        const isCancelling = cancelRequest.isPending && cancelRequest.variables === m.id;
        const confirmCancel = () =>
          Alert.alert(
            'Teklifi geri çek',
            `${targetName} adlı oyuncuya gönderdiğin teklif iptal edilsin mi?`,
            [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Geri çek',
                style: 'destructive',
                onPress: () =>
                  cancelRequest.mutate(m.id, {
                    onSuccess: () => toast.show('Teklif geri çekildi'),
                    onError: () => toast.show('Teklif geri çekilemedi', 'error'),
                  }),
              },
            ],
          );
```

(d) Kartın en altındaki format/zaman satırının (`<View className="flex-row items-center" style={{ gap: 12, flexWrap: 'wrap' }}>...</View>`) hemen ARDINA, kartı kapatan `</View>`'den ÖNCE ekle:

```tsx
            {cancelable && (
              <Pressable
                onPress={confirmCancel}
                disabled={isCancelling}
                accessibilityRole="button"
                accessibilityLabel="Teklifi geri çek"
                className="flex-row items-center justify-center rounded-md"
                style={{
                  marginTop: 12,
                  paddingVertical: 10,
                  gap: 8,
                  borderWidth: 1.5,
                  borderColor: colors.loss,
                  opacity: isCancelling ? 0.5 : 1,
                }}
              >
                <Icon name="x" size={15} color={colors.loss} />
                <Text
                  className="font-sans font-bold"
                  style={{ fontSize: 13, color: colors.loss }}
                >
                  {isCancelling ? 'Geri çekiliyor…' : 'Teklifi geri çek'}
                </Text>
              </Pressable>
            )}
```

- [ ] **Step 8: Testleri ve typecheck'i çalıştır**

Çalıştır:
```bash
cd apps/mobile && /opt/homebrew/bin/bun test lib/__tests__/match-request-rules.test.ts && npx tsc --noEmit && echo "TYPECHECK OK" && /opt/homebrew/bin/bun test 2>&1 | tail -5
```
Beklenen: 5 pass; `TYPECHECK OK`; suite **82 pass** (77 + 5), fail ≤ 11, error ≤ 10.

- [ ] **Step 9: Commit**

```bash
cd /Users/hazarustun/Developer/\[ios_app\]tennis-challenger
git add apps/mobile/lib/match-request-rules.ts apps/mobile/lib/__tests__/match-request-rules.test.ts apps/mobile/hooks/use-delete-match-request.ts apps/mobile/hooks/use-delete-open-call.ts apps/mobile/app/\(tabs\)/matches.tsx
git commit -m "feat(matches): let players withdraw their own pending challenges

The delete policy added in 20260619000004 is not restricted by request type,
so a direct challenge is cancelable by its creator exactly like an open call.
The client rule mirrors the policy in a pure, tested module.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Teklifler görünümünde Gelen / Gönderdiğim başlıkları

Segment etiketleri değişmiyor. Yalnızca `Teklifler` görünümü içindeki iki
liste görsel olarak ayrılıyor — bugün gelen listesinin başlığı yok, bu yüzden
gönderilenlerle görsel olarak birbirine karışıyor.

**Files:**
- Modify: `apps/mobile/app/(tabs)/matches.tsx` (`OffersList`, ~680-705)

**Interfaces:**
- Consumes: Task 3'ten değişmiş `SentOffersList`; yeni arayüz üretmez.

- [ ] **Step 1: OffersList'e "Gelen teklifler" başlığını ekle**

`apps/mobile/app/(tabs)/matches.tsx` içinde `OffersList`'in return bloğunu bul
(mevcut ~703-704):

```tsx
  return (
    <>
      {requests.map((m) => {
```

şununla değiştir:

```tsx
  return (
    <View style={{ gap: 11 }}>
      <Text
        className="font-display font-extrabold text-text"
        style={{ fontSize: 15, letterSpacing: -0.15, paddingHorizontal: 2 }}
      >
        Gelen teklifler
      </Text>
      {requests.map((m) => {
```

Ve aynı fonksiyonun sonundaki kapanış fragment'ını (mevcut ~814. satır — `})}`
satırının hemen ardından gelen tek başına `    </>` satırı, ondan sonra `  );`
ve `}` gelir) `    </View>` yap:

```tsx
      })}
    </View>
  );
}
```

Not: `requests` boşken fonksiyon zaten daha yukarıda `EmptyState` döndürüp
çıkıyor — başlık boş listede görünmez, doğru davranış budur.

- [ ] **Step 2: Typecheck çalıştır**

Çalıştır:
```bash
cd apps/mobile && npx tsc --noEmit && echo "TYPECHECK OK"
```
Beklenen: `TYPECHECK OK`. (JSX yapısı bozulduysa burada patlar — açılan
`<View>` ile kapanan etiket eşleşmelidir.)

- [ ] **Step 3: Suite regresyon kontrolü**

Çalıştır:
```bash
cd apps/mobile && /opt/homebrew/bin/bun test 2>&1 | tail -5
```
Beklenen: 82 pass, fail ≤ 11, error ≤ 10 (değişmemiş).

- [ ] **Step 4: Commit**

```bash
cd /Users/hazarustun/Developer/\[ios_app\]tennis-challenger
git add apps/mobile/app/\(tabs\)/matches.tsx
git commit -m "fix(matches): label the incoming offers list

The Teklifler view stacked incoming and sent offers with only the sent list
carrying a heading, so the two ran together visually.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: "Format kurallarını oku" kapısını görünür kıl

Sıralama maçlarında teklif göndermek için format kurallarının okunması zorunlu.
Bugün bu kapı kaydırma gövdesinin içinde soluk bir bağlantı; gönder butonu
pasif ama kullanıcı sebebini görmüyor.

**Files:**
- Create: `apps/mobile/lib/rules-gate.ts`
- Create: `apps/mobile/lib/__tests__/rules-gate.test.ts`
- Modify: `apps/mobile/app/match/new/preview.tsx` (~365-420)

**Interfaces:**
- Consumes: `MatchKind` ve `FormatKey` tipleri (`stores/new-match-store.ts`, `lib/formats.ts`); `useNewMatchStore` alanları `kind`, `format`, `rulesAcknowledgedFormat`.
- Produces:
  - `export type RulesGateState = 'not-required' | 'unread' | 'read'`
  - `export function rulesGateState(kind: string, format: string, acknowledgedFormat: string | null): RulesGateState`

- [ ] **Step 1: Kapı durumu için başarısız testi yaz**

`apps/mobile/lib/__tests__/rules-gate.test.ts` oluştur:

```ts
// Format-rules gate tests.
//
// Ranking matches require the player to read the format rules before the
// challenge can be sent. Friendly matches never do. Acknowledgement is
// per-format: switching format after reading re-arms the gate.

import { describe, expect, test } from 'bun:test';
import { rulesGateState } from '../rules-gate';

describe('rulesGateState', () => {
  test('friendly matches never require the rules', () => {
    expect(rulesGateState('friendly', 'klasik', null)).toBe('not-required');
  });

  test('friendly stays not-required even after an acknowledgement', () => {
    expect(rulesGateState('friendly', 'klasik', 'klasik')).toBe('not-required');
  });

  test('ranking match with no acknowledgement is unread', () => {
    expect(rulesGateState('ranking', 'klasik', null)).toBe('unread');
  });

  test('ranking match acknowledged for the selected format is read', () => {
    expect(rulesGateState('ranking', 'klasik', 'klasik')).toBe('read');
  });

  test('changing format after reading re-arms the gate', () => {
    expect(rulesGateState('ranking', 'kisa', 'klasik')).toBe('unread');
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Çalıştır:
```bash
cd apps/mobile && /opt/homebrew/bin/bun test lib/__tests__/rules-gate.test.ts
```
Beklenen: FAIL — `Cannot find module '../rules-gate'`.

- [ ] **Step 3: Kapı mantığını yaz**

`apps/mobile/lib/rules-gate.ts` oluştur:

```ts
// Format-rules acknowledgement gate.
//
// Ranking matches affect ELO and are bound by format rules, so the player
// must open the rules screen before sending. The acknowledgement is stored
// per-format (`rulesAcknowledgedFormat` in stores/new-match-store.ts) so
// switching format after reading correctly re-arms the gate.
//
// Pure module — no react-native / expo imports, so it stays testable.

export type RulesGateState = 'not-required' | 'unread' | 'read';

export function rulesGateState(
  kind: string,
  format: string,
  acknowledgedFormat: string | null,
): RulesGateState {
  if (kind !== 'ranking') return 'not-required';
  return acknowledgedFormat === format ? 'read' : 'unread';
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Çalıştır:
```bash
cd apps/mobile && /opt/homebrew/bin/bun test lib/__tests__/rules-gate.test.ts
```
Beklenen: PASS — 5 pass, 0 fail.

- [ ] **Step 5: preview.tsx'i kapı durumunu kullanacak şekilde yeniden düzenle**

`apps/mobile/app/match/new/preview.tsx`:

(a) Import ekle:

```ts
import { rulesGateState } from '../../../lib/rules-gate';
```

(b) Bileşenin render'ından önce, `nm` okunduktan sonra hesapla:

```ts
  const gate = rulesGateState(nm.kind, nm.format, nm.rulesAcknowledgedFormat);
```

(c) `ScrollView` içindeki mevcut kural bağlantısı bloğunu (365-399 satırları, `{nm.kind === 'ranking' && (() => { ... })()}` IIFE'sinin tamamı) **tamamen sil**. Kapı artık CTA'nın yanına taşınıyor.

(d) Alttaki CTA sarmalayıcısını (`<View style={{ padding: 18 }}>` ... `</View>`) şununla değiştir:

```tsx
      <View style={{ padding: 18, gap: 10 }}>
        {gate !== 'not-required' && (
          <Pressable
            onPress={() =>
              router.push(`/match/new/format-rules?format=${nm.format}` as never)
            }
            accessibilityRole="button"
            className="flex-row items-center rounded-md"
            style={{
              padding: 14,
              gap: 10,
              borderWidth: 2,
              borderColor: gate === 'read' ? colors.win : colors.warn,
              backgroundColor: gate === 'read' ? colors.limeSoft : `${colors.warn}1F`,
            }}
          >
            <Icon
              name={gate === 'read' ? 'check' : 'warn'}
              size={18}
              color={gate === 'read' ? colors.win : colors.warn}
            />
            <Text
              className="font-sans font-bold"
              style={{ flex: 1, fontSize: 13.5, color: colors.text }}
            >
              {gate === 'read'
                ? 'Format kuralları okundu'
                : 'Önce format kurallarını oku (zorunlu)'}
            </Text>
            <Icon
              name="chevR"
              size={18}
              color={gate === 'read' ? colors.win : colors.warn}
            />
          </Pressable>
        )}
        <Button
          full
          size="lg"
          disabled={gate === 'unread'}
          icon={
            submitting ? (
              <ActivityIndicator size="small" color={colors.onLime} />
            ) : (
              <Icon name="share" size={17} color={colors.onLime} />
            )
          }
          onPress={handleSubmit}
        >
          {submitting ? 'Gönderiliyor…' : 'Teklifi gönder'}
        </Button>
        {gate === 'unread' && (
          <Text
            className="font-sans text-text-3"
            style={{ fontSize: 12.5, textAlign: 'center' }}
          >
            Göndermek için format kurallarını okumalısın.
          </Text>
        )}
      </View>
```

- [ ] **Step 6: Testleri ve typecheck'i çalıştır**

Çalıştır:
```bash
cd apps/mobile && /opt/homebrew/bin/bun test lib/__tests__/rules-gate.test.ts && npx tsc --noEmit && echo "TYPECHECK OK" && /opt/homebrew/bin/bun test 2>&1 | tail -5
```
Beklenen: 5 pass; `TYPECHECK OK`; suite **87 pass** (82 + 5), fail ≤ 11, error ≤ 10.

- [ ] **Step 7: Commit**

```bash
cd /Users/hazarustun/Developer/\[ios_app\]tennis-challenger
git add apps/mobile/lib/rules-gate.ts apps/mobile/lib/__tests__/rules-gate.test.ts apps/mobile/app/match/new/preview.tsx
git commit -m "fix(match): make the mandatory format-rules gate visible

The gate sat mid-scroll while the send button was silently disabled, so the
reason for the disabled CTA was off-screen. It now sits directly above the
button with a warning treatment and an explicit reason line.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Cihazda uçtan uca doğrulama

Otomatik testler saf mantığı kapsıyor; yerleşim ve navigasyon değişikliklerinin
gerçek cihazda görülmesi gerekiyor. Bu task kod değiştirmez.

**Files:** Yok (yalnızca doğrulama).

- [ ] **Step 1: Dev build'i başlat**

Çalıştır:
```bash
cd apps/mobile && npx expo start --dev-client
```
(Veya mevcut TestFlight/dev-client kurulumunla aç.)

- [ ] **Step 2: Kabul kriterlerini tek tek geç**

Her maddeyi cihazda gözle doğrula:

1. Alt çubukta **Maçlar** sekmesi ikonu **takvim**; ortadaki büyük buton **tenis topu**. Ortadaki butona basınca hâlâ "Yeni Maç" sihirbazı (`/match/new/type`) açılıyor.
2. **Anasayfa, Maçlar, Sıralama, Profil** — dördünün de başlığında mesaj ikonu var; basınca `/messages` açılıyor. Okunmamış mesaj varken pembe rozet sayıyı gösteriyor.
3. Maçlar → **Teklifler**: üstte **Gelen teklifler**, altta **Gönderdiğim teklifler** başlıkları ayrı görünüyor.
4. Gönderdiğin, henüz yanıtlanmamış bir teklifte **"Teklifi geri çek"** butonu var; basınca onay soruyor, onaylayınca kart listeden kayboluyor ve "Teklif geri çekildi" bildirimi çıkıyor.
5. **Kabul edilmiş** bir gönderilen teklifte geri çekme butonu **görünmüyor**.
6. Yeni Maç → Sıralama Maçı → ... → **Teklif önizleme**: gönder butonunun hemen üstünde amber "Önce format kurallarını oku (zorunlu)" kartı, butonun altında "Göndermek için format kurallarını okumalısın." satırı. Kuralları okuduktan sonra kart yeşile dönüyor, sebep satırı kayboluyor, buton aktifleşiyor.
7. **Dostluk Maçı** önizlemesinde kural kartı hiç görünmüyor ve buton baştan aktif.
8. Kapsam dışı ekranlar (onboarding, Sıralama listesi, Anasayfa kartları) değişmemiş.

- [ ] **Step 3: Bulguları raporla**

Başarısız olan madde varsa ilgili task'a dön ve düzelt. Hepsi geçiyorsa
kullanıcıya doğrulama sonucunu bildir ve yeni bir EAS build gerekip
gerekmediğini sor.

---

## Doğrulanmış ön koşullar (uygulayıcı için notlar)

Bu plan yazılmadan önce şunlar deneyle kanıtlandı — tekrar araştırmaya gerek yok:

- `useUnreadMessageCount` **zaten var** (`hooks/use-conversations.ts:113`, `unread_message_count` RPC'si). Yeni hook yazma.
- Rozetli mesaj butonu **zaten yazılmış**, sadece `matches.tsx:202-244` içinde satır içi. Task 2 bunu çıkarır, sıfırdan yazmaz.
- `NavHeader` **tek** aksiyon yuvası sunuyor ve üç sekme de onu harcamış durumda (clock / filter / settings) — `rightSlot` bu yüzden gerekli.
- Anasayfa `NavHeader` **kullanmıyor**; `GreetHeader` kullanıyor — bu yüzden ayrı `leftOfBell` yuvası.
- `match_requests` silme politikası `type` sütununa **kısıtlı değil** → direkt teklifler silinebilir, **migration gerekmiyor**.
- `calendar` ikonu `Icon.tsx:160`'ta **zaten mevcut**; yeni glyph çizmeye gerek yok.
- `BallMark` (`components/ui/doodles/BallMark.tsx`) props'ları: `size`, `color`, `stroke`, `sw`.
- `TabBar.tsx` hook kullandığı için deponun render-suz test deseniyle **çağrılamaz** (`Invalid hook call`) — ikon değişikliğinin testi bu yüzden saf `tab-slots.ts` üzerinden yapılıyor.
- `bun` PATH'te değil; `/opt/homebrew/bin/bun` tam yolunu kullan.
