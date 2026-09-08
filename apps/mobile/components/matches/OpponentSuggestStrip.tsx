// components/matches/OpponentSuggestStrip.tsx — Plan 8 Phase (post-G).
//
// "Sana uygun rakipler" horizontal suggestion strip.
//
// Props:
//   category — the ranking category key to suggest opponents for
//   variant  — 'compact' (tighter card) for Home;
//              'full'    (standard card) for Matches hub
//
// Both variants render the SAME list — up to MAX_SUGGESTIONS (24) scored
// candidates — in a horizontally scrollable FlatList. The strip used to be
// clipped to the top 3 / top 5, which meant a player who had already played
// (or didn't fancy) those few had nothing left to do here. `variant` now only
// controls card metrics, not how many opponents you get to see.
//
// FlatList (not ScrollView + map) so the off-screen cards are virtualized —
// each card renders an Avatar and a level lookup, and there can be two dozen.
//
// Data source: useOpponentSuggestions(category)
//   Returns { suggestions: SuggestionItem[], isLoading }
//   Each SuggestionItem: { userId, name, rating, score }
//
// "Meydan oku" prefill mirrors user/[userId].tsx:
//   setField('opponent', { userId, name, elo: rating })
//   router.push('/match/new/detail')
//
// Empty: returns null (no empty box shown).
// Loading: skeleton cards.

import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '../ui/Avatar';
import { Skel } from '../ui/Skel';
import { levelForElo } from '../../lib/levels';
import {
  useOpponentSuggestions,
  type SuggestionItem,
} from '../../hooks/use-opponent-suggestions';
import { useNewMatchStore } from '../../stores/new-match-store';
import { colors } from '../../theme/colors';

export interface OpponentSuggestStripProps {
  category: string;
  variant?: 'full' | 'compact';
}

export function OpponentSuggestStrip({
  category,
  variant = 'full',
}: OpponentSuggestStripProps) {
  const setField = useNewMatchStore((s) => s.setField);
  const { suggestions, isLoading } = useOpponentSuggestions(category);

  // Skeleton count only — the real list is capped by the hook, not here.
  const skeletonCount = variant === 'compact' ? 3 : 5;
  const cardWidth = variant === 'compact' ? 124 : 140;
  const cardPadding = variant === 'compact' ? 10 : 13;

  // Loading — show placeholder skeleton cards
  if (isLoading) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 0 }}
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <View
            key={i}
            style={{
              width: cardWidth,
              backgroundColor: colors.surface,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              padding: cardPadding,
              gap: 8,
              alignItems: 'center',
            }}
          >
            <Skel w={36} h={36} r={18} />
            <Skel w={72} h={12} r={6} />
            <Skel w={44} h={10} r={5} />
            <Skel w={80} h={28} r={9999} />
          </View>
        ))}
      </ScrollView>
    );
  }

  // Empty — render nothing
  if (suggestions.length === 0) return null;

  function handleMeydanOku(userId: string, name: string, rating: number) {
    // Mirror exactly what user/[userId].tsx does in meydanOku():
    //   setField('opponent', { userId, name, elo: primaryElo })
    //   router.push('/match/new/detail')
    setField('opponent', {
      userId,
      name,
      elo: rating,
    });
    router.push('/match/new/detail' as never);
  }

  function renderCard({ item: s }: { item: SuggestionItem }) {
    const lv = levelForElo(s.rating);
    // Names are built as `${first_name} ${last_name}`, so a profile with an
    // empty last_name arrives as "Ada " — the trailing space is measured but
    // never drawn, which pushes the glyphs left of centre.
    const name = s.name.trim();

    return (
      <View
        style={{
          width: cardWidth,
          backgroundColor: colors.surface,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          padding: cardPadding,
          alignItems: 'center',
          gap: variant === 'compact' ? 6 : 8,
        }}
      >
        {/* Avatar + name open the player's profile. The Meydan oku button
            below stays the card's primary action; this is the secondary
            "who is this?" path.

            Layout notes (this block used to render the name off-centre):
              - `alignSelf: 'stretch'` makes this column exactly as wide as the
                card's content box. Without it the column shrink-wrapped to the
                widest child, so a name wider than the avatar left the avatar
                pinned to the column's leading edge while the name filled it —
                the two never lined up on the same centre.
              - The name then also stretches, so its text box is the full card
                width and `textAlign: 'center'` is what actually centres the
                glyphs, instead of the result depending on Yoga's intrinsic
                measurement of the string.
              - Press feedback moved from a `style` callback to `active:` so it
                survives NativeWind's className/style interop. */}
        <Pressable
          onPress={() => router.push(`/user/${s.userId}` as never)}
          accessibilityRole="button"
          accessibilityLabel={`${name} profilini aç`}
          className="active:opacity-60"
          style={{
            alignSelf: 'stretch',
            alignItems: 'center',
            gap: variant === 'compact' ? 6 : 8,
          }}
        >
          <Avatar name={name} size={variant === 'compact' ? 38 : 44} ring={lv.color} />
          <Text
            className="font-sans font-bold text-text"
            style={{
              alignSelf: 'stretch',
              fontSize: variant === 'compact' ? 12.5 : 13.5,
              textAlign: 'center',
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {name}
          </Text>
        </Pressable>

        {/* ELO pill — uses the same inline pill pattern as OffersList / FeedList */}
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 9999,
            backgroundColor: `${lv.color}22`,
          }}
        >
          <Text
            className="font-num font-extrabold"
            style={{
              fontSize: variant === 'compact' ? 11 : 12,
              color: lv.color,
            }}
          >
            {s.rating}
          </Text>
        </View>

        {/* Meydan oku button */}
        <Pressable
          onPress={() => handleMeydanOku(s.userId, name, s.rating)}
          accessibilityRole="button"
          accessibilityLabel={`${name}'e meydan oku`}
          className="active:opacity-80"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            width: '100%',
            height: variant === 'compact' ? 30 : 34,
            borderRadius: 9999,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            backgroundColor: colors.lime,
          }}
        >
          <Text
            style={{
              fontFamily: 'PlusJakartaSans-ExtraBold',
              fontSize: variant === 'compact' ? 11 : 12,
              color: colors.onLime,
            }}
          >
            Meydan oku
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={suggestions}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(s) => s.userId}
      renderItem={renderCard}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 0 }}
      // Roughly one screen's worth up front; the rest mounts as you swipe.
      initialNumToRender={4}
      windowSize={5}
      removeClippedSubviews={false}
    />
  );
}
