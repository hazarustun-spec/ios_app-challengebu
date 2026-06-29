// Onboarding · Tamamlandı (D15) — review → confirm → celebration
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-onboarding.jsx — ObDone
//
// Two-phase screen:
//   Phase 1 (review)   — shows a compact summary of everything the user entered.
//                        "Onayla ve bitir" button triggers the Supabase submit.
//   Phase 2 (celebrate) — shown after a successful submit; the lime hero card
//                        with welcome message + stat strip + CTA to explore.
//
// Submit runs on button press (not on mount). On error, the review phase is
// re-shown with a retry button. The existing celebration UI is unchanged.

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
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

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

const CATEGORY_LABEL: Record<GenderCategory, string> = {
  erkek: 'Erkek',
  kadin: 'Kadın',
  open_only: 'Sadece Open',
};

const LEVEL_LABEL: Record<SkillLevel, string> = {
  baslangic: 'Başlangıç',
  orta: 'Orta',
  ileri: 'İleri',
};

const HAND_LABEL: Record<DominantHand, string> = {
  sag: 'Sağ',
  sol: 'Sol',
};

const YEAR_LABEL: Record<ClassYear, string> = {
  hazirlik: 'Hazırlık',
  '1': '1. Sınıf',
  '2': '2. Sınıf',
  '3': '3. Sınıf',
  '4': '4. Sınıf',
  yl: 'Yüksek Lisans',
  doktora: 'Doktora',
};

const SLOT_LABEL: Record<AvailabilitySlot, string> = {
  wd_am: 'Hİ Sabah',
  wd_noon: 'Hİ Öğlen',
  wd_eve: 'Hİ Akşam',
  we_am: 'HS Sabah',
  we_noon: 'HS Öğlen',
  we_eve: 'HS Akşam',
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ObDone() {
  const insets = useSafeAreaInsets();
  const reset = useOnboardingStore((s) => s.reset);
  const submit = useSubmitOnboarding();

  // Snapshot the entire draft at mount — reset() clears the store on success,
  // so we capture everything we need before that happens.
  const [snapshot] = useState(() => {
    const s = useOnboardingStore.getState();
    return {
      firstName: s.firstName,
      lastName: s.lastName,
      pronoun: s.pronoun,
      category: s.category,
      classYear: s.classYear,
      departmentName: s.departmentName,
      level: s.level,
      hand: s.hand,
      availability: [...s.availability],
    };
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    const draft = pickDraft(useOnboardingStore.getState());
    submit
      .mutateAsync({ draft })
      .then(async () => {
        try {
          await loadProfile();
        } catch {
          // Non-fatal — the next auth state change will refresh.
        }
        reset();
        setSubmitted(true);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Profil oluşturulamadı.');
      });
  };

  // Pop animation for the BallMark — only relevant in celebration phase but
  // we initialise the shared values unconditionally to satisfy hooks rules.
  const ballScale = useSharedValue(0.6);
  const ballOpacity = useSharedValue(0);
  const ballStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ballScale.value }],
    opacity: ballOpacity.value,
  }));

  // Cast: typed-routes file regenerates on `expo start`; until then `/(tabs)`
  // is not in the route union. Path is runtime-validated by Expo Router.
  const goHome = () => router.replace('/(tabs)' as never);

  // ── Phase 2: celebration ─────────────────────────────────────────────────
  if (submitted) {
    // Trigger ball animation once the celebration is rendered.
    ballOpacity.value = withTiming(1, { duration: 220 });
    ballScale.value = withSequence(
      withTiming(1.12, { duration: 250, easing: Easing.bezier(0.2, 0.9, 0.3, 1.1) }),
      withTiming(1.0, { duration: 200 }),
    );

    const level = levelForElo(INITIAL_ELO);

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
          {/* Decorative doodles */}
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
            {snapshot.firstName || 'oyuncu'}!
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
              style={{ fontSize: 10.5, letterSpacing: 0.6, color: 'rgba(255,255,255,0.55)' }}
            >
              SEVİYE
            </Text>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}
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

        {/* CTAs */}
        <View style={{ marginTop: 12, gap: 10 }}>
          <Button full size="lg" arrow onPress={goHome}>
            Sıralamayı keşfet
          </Button>
          <Pressable
            onPress={goHome}
            style={{ alignItems: 'center', paddingVertical: 8 }}
          >
            <Text
              className="font-sans font-bold"
              style={{ fontSize: 14, color: colors.clay }}
            >
              İlk maçını oluştur
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Phase 1: review ──────────────────────────────────────────────────────
  const availText =
    snapshot.availability.length > 0
      ? snapshot.availability.map((s) => SLOT_LABEL[s]).join(', ')
      : '—';

  return (
    <View
      className="flex-1 bg-bg"
      style={{
        paddingTop: 10 + insets.top,
        paddingHorizontal: 18,
        paddingBottom: 24,
      }}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text
          className="font-display font-extrabold text-text"
          style={{ fontSize: 26, letterSpacing: -0.52, marginBottom: 6 }}
        >
          Bilgilerini kontrol et
        </Text>
        <Text
          className="font-sans text-text-2"
          style={{ fontSize: 15, lineHeight: 23, marginBottom: 22 }}
        >
          Her şey doğru mu? Onayladıktan sonra profil oluşturulur.
        </Text>

        {/* Summary card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: colors.borderStrong,
            overflow: 'hidden',
          }}
        >
          <ReviewRow label="Ad Soyad" value={`${snapshot.firstName} ${snapshot.lastName}`.trim()} />
          <ReviewRow label="Zamir" value={snapshot.pronoun ?? '—'} />
          <ReviewRow
            label="Kategori"
            value={snapshot.category ? CATEGORY_LABEL[snapshot.category] : '—'}
          />
          <ReviewRow
            label="Sınıf"
            value={snapshot.classYear ? YEAR_LABEL[snapshot.classYear] : '—'}
          />
          <ReviewRow
            label="Bölüm"
            value={snapshot.departmentName || '—'}
          />
          <ReviewRow
            label="Seviye"
            value={snapshot.level ? LEVEL_LABEL[snapshot.level] : '—'}
          />
          <ReviewRow
            label="Dominant El"
            value={snapshot.hand ? HAND_LABEL[snapshot.hand] : '—'}
            last
          />
        </View>

        {/* Availability — separate card since value can be long */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: colors.borderStrong,
            marginTop: 10,
            padding: 16,
          }}
        >
          <Text
            className="font-sans font-bold text-text-3"
            style={{ fontSize: 11.5, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}
          >
            Müsaitlik
          </Text>
          <Text className="font-sans font-semibold text-text" style={{ fontSize: 14.5, lineHeight: 21 }}>
            {availText}
          </Text>
        </View>
      </ScrollView>

      {error && (
        <Text
          className="font-sans font-bold"
          style={{ color: colors.loss, fontSize: 13, marginTop: 8, marginBottom: 4 }}
        >
          {error}
        </Text>
      )}

      {/* CTA */}
      <View style={{ marginTop: 12 }}>
        <Button
          full
          size="lg"
          arrow
          loading={submit.isPending}
          onPress={handleConfirm}
        >
          {error ? 'Tekrar dene' : 'Onayla ve bitir'}
        </Button>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ReviewRow helper
// ---------------------------------------------------------------------------

function ReviewRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: last ? 0 : 1,
        borderColor: colors.surface3,
        gap: 12,
      }}
    >
      <Text
        className="font-sans font-bold text-text-3"
        style={{ fontSize: 13.5 }}
      >
        {label}
      </Text>
      <Text
        className="font-sans font-semibold text-text"
        style={{ fontSize: 14, textAlign: 'right', flex: 1 }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Draft snapshot helper
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
  // All four nullable fields are guaranteed to be set at this point because
  // their respective steps gate canNext until the user makes a choice.
  return {
    firstName: s.firstName,
    lastName: s.lastName,
    phone: s.phone,
    pronoun: s.pronoun!,
    category: s.category!,
    departmentId: s.departmentId,
    departmentName: s.departmentName,
    showDepartment: s.showDepartment,
    classYear: s.classYear,
    showClassYear: s.showClassYear,
    level: s.level!,
    hand: s.hand!,
    availability: s.availability,
    photoUri: s.photoUri,
  };
}
