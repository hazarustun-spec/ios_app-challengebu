// components/matches/OpponentSuggestStrip.tsx — Plan 8 Phase (post-G).
//
// "Sana uygun rakipler" horizontal suggestion strip.
//
// Props:
//   category — the ranking category key to suggest opponents for
//   variant  — 'compact' (top 3, tighter card) for Home;
//              'full'    (all 5, standard card) for Matches hub
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

import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '../ui/Avatar';
import { Skel } from '../ui/Skel';
import { levelForElo } from '../../lib/levels';
import { useOpponentSuggestions } from '../../hooks/use-opponent-suggestions';
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

  const limit = variant === 'compact' ? 3 : 5;
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
        {Array.from({ length: limit }).map((_, i) => (
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
  const visible = suggestions.slice(0, limit);
  if (visible.length === 0) return null;

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

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 0 }}
    >
      {visible.map((s) => {
        const lv = levelForElo(s.rating);

        return (
          <View
            key={s.userId}
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
            {/* Avatar with level ring */}
            <Avatar name={s.name} size={variant === 'compact' ? 38 : 44} ring={lv.color} />

            {/* Name — single line, ellipsis */}
            <Text
              className="font-sans font-bold text-text"
              style={{
                fontSize: variant === 'compact' ? 12.5 : 13.5,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {s.name}
            </Text>

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
              onPress={() => handleMeydanOku(s.userId, s.name, s.rating)}
              accessibilityRole="button"
              accessibilityLabel={`${s.name}'e meydan oku`}
              style={({ pressed }) => ({
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
                opacity: pressed ? 0.8 : 1,
              })}
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
      })}
    </ScrollView>
  );
}
