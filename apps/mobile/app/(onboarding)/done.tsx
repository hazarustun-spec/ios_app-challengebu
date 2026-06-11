// Onboarding · Tamamlandı (D15) — celebration + profile insert
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-onboarding.jsx — ObDone
//
// Final onboarding screen. Submits the accumulated wizard draft to Supabase
// (profile row + 1200 ELO seeds via `useSubmitOnboarding`), then displays a
// lime hero card with welcome message and stat strip (Başlangıç ELO 1200 +
// Çaylak level). CTA navigates to the post-onboarding home tabs.
//
// Submission runs on mount, guarded by local `submitted` state so React 18's
// double-mount in dev does not insert twice. On success we re-load the auth
// profile so the root index redirect (`app/index.tsx`) routes the user to
// `/(app)/home`. On failure we surface a Turkish error and let the user
// retry via the primary CTA.

import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '../../components/ui/Button';
import { LevelIcon } from '../../components/ui/LevelIcon';
import { BallMark } from '../../components/ui/doodles/BallMark';
import { Cloud } from '../../components/ui/doodles/Cloud';
import { Dots } from '../../components/ui/doodles/Dots';
import { Squiggle } from '../../components/ui/doodles/Squiggle';
import { Star } from '../../components/ui/doodles/Star';
import { loadProfile } from '../../lib/auth-bootstrap';
import { levelForElo } from '../../lib/levels';
import { useSubmitOnboarding } from '../../hooks/use-submit-onboarding';
import {
  useOnboardingStore,
  type AvailabilitySlot,
  type ClassYear,
  type DominantHand,
  type GenderCategory,
  type Pronoun,
  type SkillLevel,
} from '../../stores/onboarding-store';
import { colors } from '../../theme/colors';

const INITIAL_ELO = 1200;

export default function ObDone() {
  const insets = useSafeAreaInsets();
  const firstName = useOnboardingStore((s) => s.firstName);
  const reset = useOnboardingStore((s) => s.reset);
  const submit = useSubmitOnboarding();

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSubmitted = useRef(false);

  // Take a stable snapshot of the draft for the mutation. We do this lazily
  // inside the effect so a stale render doesn't capture an in-flight value.
  useEffect(() => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;

    const draft = pickDraft(useOnboardingStore.getState());
    submit
      .mutateAsync({ draft })
      .then(async () => {
        // Re-fetch profile so root index redirect sees onboardingComplete.
        try {
          await loadProfile();
        } catch {
          // Non-fatal — the next auth state change will refresh.
        }
        reset();
        setSubmitted(true);
      })
      .catch((e: unknown) => {
        hasSubmitted.current = false; // allow retry from CTA
        setError(e instanceof Error ? e.message : 'Profil oluşturulamadı.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const level = levelForElo(INITIAL_ELO);

  // Pop animation for the BallMark — fade + scale overshoot.
  const ballScale = useSharedValue(0.6);
  const ballOpacity = useSharedValue(0);
  useEffect(() => {
    ballOpacity.value = withTiming(1, { duration: 220 });
    ballScale.value = withSequence(
      withTiming(1.12, {
        duration: 250,
        easing: Easing.bezier(0.2, 0.9, 0.3, 1.1),
      }),
      withTiming(1.0, { duration: 200 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ballStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ballScale.value }],
    opacity: ballOpacity.value,
  }));

  const goHome = () => router.replace('/(app)/home');

  const retry = () => {
    setError(null);
    const draft = pickDraft(useOnboardingStore.getState());
    submit
      .mutateAsync({ draft })
      .then(async () => {
        try {
          await loadProfile();
        } catch {
          /* ignore */
        }
        reset();
        setSubmitted(true);
        goHome();
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Profil oluşturulamadı.');
      });
  };

  const primaryLabel = error ? 'Tekrar dene' : 'Sıralamayı keşfet';
  const onPrimary = error ? retry : goHome;
  const primaryLoading = !error && (submit.isPending || (!submitted && !error));

  return (
    <View
      className="flex-1 bg-bg"
      style={{
        paddingTop: 10 + insets.top,
        paddingHorizontal: 18,
        paddingBottom: 24,
      }}
    >
      {/* Hero card */}
      <View
        className="rounded-xl bg-lime"
        style={{
          flex: 1,
          overflow: 'hidden',
          padding: 30,
          paddingHorizontal: 26,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Decorative doodles — pointer-events off */}
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        >
          <Cloud
            w={150}
            color="rgba(255,255,255,0.25)"
            fill="rgba(255,255,255,0.25)"
            style={{ position: 'absolute', top: -14, left: -20 }}
          />
          <Squiggle
            w={64}
            color={colors.pink}
            stroke={4}
            style={{ position: 'absolute', top: 40, right: 28 }}
          />
          <Star
            size={22}
            color="#FFFFFF"
            style={{ position: 'absolute', bottom: 150, left: 30 }}
          />
          <Dots
            size={40}
            color="rgba(22,22,24,0.45)"
            style={{ position: 'absolute', bottom: 60, right: 26 }}
          />
        </View>

        {/* Animated ball */}
        <Animated.View style={ballStyle}>
          <BallMark size={92} color="#FFFFFF" />
        </Animated.View>

        {/* Tag */}
        <View
          style={{
            backgroundColor: 'rgba(0,0,0,0.26)',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 9999,
            marginTop: 22,
          }}
        >
          <Text
            className="font-sans font-extrabold text-white"
            style={{ fontSize: 12.5, letterSpacing: 0.5 }}
          >
            PROFİL HAZIR
          </Text>
        </View>

        <Text
          className="font-display font-extrabold text-white"
          style={{
            fontSize: 34,
            lineHeight: 35,
            letterSpacing: -1.02,
            textAlign: 'center',
            marginTop: 14,
          }}
        >
          {'Hoş geldin,\n'}
          {firstName || 'oyuncu'}!
        </Text>
        <Text
          className="font-sans font-bold"
          style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.92)',
            lineHeight: 22,
            textAlign: 'center',
            marginTop: 12,
            maxWidth: 280,
          }}
        >
          İlk 10 maçında ELO&apos;n hızla gerçek yerini bulacak.
        </Text>
      </View>

      {/* Stat strip */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: colors.borderStrong,
            padding: 14,
            paddingHorizontal: 16,
          }}
        >
          <Text
            className="font-sans font-extrabold text-text-3"
            style={{ fontSize: 10.5, letterSpacing: 0.6 }}
          >
            BAŞLANGIÇ ELO
          </Text>
          <Text
            className="font-num font-display font-extrabold text-text"
            style={{ fontSize: 26, marginTop: 3 }}
          >
            {INITIAL_ELO}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.court,
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: colors.borderStrong,
            padding: 14,
            paddingHorizontal: 16,
          }}
        >
          <Text
            className="font-sans font-extrabold"
            style={{
              fontSize: 10.5,
              letterSpacing: 0.6,
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            SEVİYE
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 6,
            }}
          >
            <LevelIcon level={level} size={18} />
            <Text
              className="font-display font-extrabold text-white"
              style={{ fontSize: 17 }}
            >
              {level.name}
            </Text>
          </View>
        </View>
      </View>

      {error && (
        <Text
          className="font-sans font-bold"
          style={{ color: colors.loss, fontSize: 13, marginTop: 8 }}
        >
          {error}
        </Text>
      )}

      {/* CTAs */}
      <View style={{ marginTop: 12, gap: 10 }}>
        <Button
          full
          size="lg"
          arrow
          loading={primaryLoading}
          onPress={onPrimary}
        >
          {primaryLabel}
        </Button>
        <Pressable
          onPress={goHome}
          style={{ alignItems: 'center', paddingVertical: 8 }}
          disabled={!submitted}
        >
          <Text
            className="font-sans font-bold"
            style={{
              fontSize: 14,
              color: submitted ? colors.clay : colors.text3,
            }}
          >
            İlk maçını oluştur
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface DraftSnapshot {
  firstName: string;
  lastName: string;
  phone: string | null;
  pronoun: Pronoun;
  category: GenderCategory;
  departmentId: string | null;
  departmentName: string;
  showDepartment: boolean;
  classYear: ClassYear | null;
  showClassYear: boolean;
  level: SkillLevel;
  hand: DominantHand;
  availability: AvailabilitySlot[];
  photoUri: string | null;
}

function pickDraft(s: ReturnType<typeof useOnboardingStore.getState>): DraftSnapshot {
  return {
    firstName: s.firstName,
    lastName: s.lastName,
    phone: s.phone,
    pronoun: s.pronoun,
    category: s.category,
    departmentId: s.departmentId,
    departmentName: s.departmentName,
    showDepartment: s.showDepartment,
    classYear: s.classYear,
    showClassYear: s.showClassYear,
    level: s.level,
    hand: s.hand,
    availability: s.availability,
    photoUri: s.photoUri,
  };
}
