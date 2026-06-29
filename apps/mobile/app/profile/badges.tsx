// Badges — Plan 8 Phase F4, wired to live data.
//
// Grid of all badges (earned + locked) with a 3-pin selection for the
// profile vitrin. Picking the same badge a second time un-pins it; new
// pins past 3 are silently ignored (matches the source).
//
// Live data:
//   - useAllBadges()  → full catalog (BadgeCatalogRow[])
//   - useMyBadges()   → user's earned badges, pinned_at marks current showcase
//   - usePinBadges()  → mutation to persist the 3-pin showcase

import { useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { BadgeArt } from '../../components/ui/BadgeArt';
import { useAllBadges } from '../../hooks/use-all-badges';
import type { BadgeCatalogRow } from '../../hooks/use-all-badges';
import { useMyBadges } from '../../hooks/use-my-badges';
import { usePinBadges } from '../../hooks/use-pin-badges';
import { colors } from '../../theme/colors';
import { ShareSheet } from '../../components/share/ShareSheet';
import { CardBadgeWon } from '../../components/share/CardBadgeWon';
import type { MyBadgeRow } from '../../hooks/use-my-badges';

// ---------------------------------------------------------------------------
// Per-item animated card — staggered FadeInDown entrance; earned badges get
// a one-shot scale pop (0.9 → overshoot spring → 1) so they feel rewarding.
// ---------------------------------------------------------------------------

interface BadgeGridItemProps {
  b: BadgeCatalogRow;
  index: number;
  has: boolean;
  isPin: boolean;
  earned: MyBadgeRow[];
  togglePin: (id: string) => void;
  onShare: (row: MyBadgeRow) => void;
}

function BadgeGridItem({ b, index, has, isPin, earned, togglePin, onShare }: BadgeGridItemProps) {
  // Pop spring: earned start at 0.9 and spring to 1 (slight overshoot feels rewarding);
  // locked badges stay at 1 and never animate.
  const popScale = useSharedValue(has ? 0.9 : 1);

  useEffect(() => {
    if (has) {
      popScale.value = withSpring(1, { damping: 6, stiffness: 220 });
    }
  }, []);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: popScale.value }],
  }));

  return (
    // Outer Animated.View carries the staggered FadeInDown entrance.
    // Stagger capped at index 10 so long catalogs don't drag.
    <Animated.View
      entering={FadeInDown.duration(350)
        .delay(Math.min(index, 10) * 35)
        .springify()
        .damping(17)
        .stiffness(130)}
      style={{ width: '48%' }}
    >
      {/* Inner Animated.View applies the earned-badge pop scale. */}
      <Animated.View style={popStyle}>
        <Pressable
          onPress={() => has && togglePin(b.id)}
          onLongPress={() => {
            if (has) {
              const earnedRow = earned.find((e) => e.badge_id === b.id);
              if (earnedRow) onShare(earnedRow);
            }
          }}
          delayLongPress={500}
          style={{
            padding: 16,
            paddingHorizontal: 12,
            alignItems: 'center',
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: isPin ? colors.clay : colors.borderStrong,
            backgroundColor: colors.surface,
            opacity: has ? 1 : 0.55,
            position: 'relative',
          }}
        >
          {/* Pin indicator */}
          {isPin && (
            <View
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: colors.clay,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check" size={11} color="#FFFFFF" stroke={3} />
            </View>
          )}
          {/* Share affordance on earned badges */}
          {has && !isPin && (
            <Pressable
              onPress={() => {
                const earnedRow = earned.find((e) => e.badge_id === b.id);
                if (earnedRow) onShare(earnedRow);
              }}
              hitSlop={8}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 22,
                height: 22,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="share" size={14} color={colors.text3} stroke={1.8} />
            </Pressable>
          )}
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: has ? `${colors.acGold}24` : colors.surface2,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            {has ? (
              <BadgeArt code={b.code} size={46} fallback={b.icon} />
            ) : (
              <Icon name="lock" size={22} color={colors.text3} />
            )}
          </View>
          <Text
            className="font-sans font-extrabold text-text"
            style={{ fontSize: 13.5, textAlign: 'center' }}
          >
            {b.name_tr}
          </Text>
          <Text
            className="font-sans text-text-3"
            style={{
              fontSize: 11,
              marginTop: 4,
              lineHeight: 15,
              textAlign: 'center',
            }}
          >
            {b.description_tr}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function Badges() {
  const allBadgesQ = useAllBadges();
  const myBadgesQ = useMyBadges();
  const pinMutation = usePinBadges();
  const [shareBadge, setShareBadge] = useState<MyBadgeRow | null>(null);

  const catalog = allBadgesQ.data ?? [];
  const earned = myBadgesQ.data ?? [];

  // Set of badge_ids the user has earned
  const earnedIds = new Set(earned.map((b) => b.badge_id));

  // Derive initial pinned badge_ids from pinned_at field
  const initialPinned = earned
    .filter((b) => b.pinned_at !== null)
    .map((b) => b.badge_id);

  const [pinned, setPinned] = useState<string[]>(initialPinned);

  // Sync pinned state when earned badges load (after first fetch)
  useEffect(() => {
    if (myBadgesQ.isSuccess) {
      const fromServer = earned
        .filter((b) => b.pinned_at !== null)
        .map((b) => b.badge_id);
      setPinned(fromServer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myBadgesQ.isSuccess, myBadgesQ.dataUpdatedAt]);

  const togglePin = (badgeId: string) => {
    setPinned((p) =>
      p.includes(badgeId)
        ? p.filter((x) => x !== badgeId)
        : p.length < 3
          ? [...p, badgeId]
          : p,
    );
  };

  const handleSave = () => {
    pinMutation.mutate(
      { selectedBadgeIds: pinned },
      { onSuccess: () => router.back() },
    );
  };

  const isLoading = allBadgesQ.isLoading || myBadgesQ.isLoading;
  const isError = allBadgesQ.isError || myBadgesQ.isError;

  const header = (
    <NavHeader
      title="Rozetler"
      subtitle={`${earned.length}/${catalog.length} kazanıldı`}
      onBack={() => router.back()}
    />
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center" style={{ padding: 32 }}>
          <Text
            className="font-sans text-text-3"
            style={{ fontSize: 14, textAlign: 'center' }}
          >
            Rozetler yüklenemedi. Lütfen tekrar dene.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Rozetler"
        subtitle={`${earned.length}/${catalog.length} kazanıldı`}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <View
          className="flex-row bg-clay-softer rounded-md"
          style={{
            padding: 13,
            gap: 10,
            borderWidth: 1,
            borderColor: colors.claySoft,
          }}
        >
          <Icon name="star" size={18} color={colors.clay} />
          <Text
            className="font-sans text-text-2"
            style={{ flex: 1, fontSize: 12.5, lineHeight: 18 }}
          >
            Profilinde gösterilecek{' '}
            <Text className="font-bold text-text">3 rozet</Text> seç. (
            {pinned.length}/3)
          </Text>
        </View>

        {catalog.length === 0 ? (
          <Text
            className="font-sans text-text-3"
            style={{ fontSize: 13, textAlign: 'center', paddingVertical: 24 }}
          >
            Rozet kataloğu henüz boş.
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {catalog.map((b, index) => (
              <BadgeGridItem
                key={b.id}
                b={b}
                index={index}
                has={earnedIds.has(b.id)}
                isPin={pinned.includes(b.id)}
                earned={earned}
                togglePin={togglePin}
                onShare={setShareBadge}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={{ padding: 18 }}>
        <Button
          full
          size="lg"
          onPress={handleSave}
          disabled={pinMutation.isPending}
        >
          {pinMutation.isPending ? 'Kaydediliyor…' : 'Vitrini kaydet'}
        </Button>
      </View>

      {/* Badge share sheet */}
      {shareBadge != null && (
        <ShareSheet
          visible={shareBadge !== null}
          onClose={() => setShareBadge(null)}
          title="Rozeti paylaş"
        >
          <CardBadgeWon
            name="Sen"
            badgeLabel={shareBadge.name_tr}
            badgeEmoji={shareBadge.icon}
            badgeCode={shareBadge.code}
            subtitle={shareBadge.description_tr}
          />
        </ShareSheet>
      )}
    </View>
  );
}
