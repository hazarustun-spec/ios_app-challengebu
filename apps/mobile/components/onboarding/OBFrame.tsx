// OBFrame — shared onboarding wizard frame, Plan 8 Phase D5-D14.
//
// Ports the design bundle's `OBFrame` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-onboarding.jsx
// lines 10-34) to React Native + Expo Router.
//
// Layout:
//   - Header row: 38×38 back chip, progress bar, "n/10" counter.
//   - Scrollable body: 26px title + 15px subtitle + step children.
//   - Footer: optional "Atla" (secondary) + primary "Devam".
//
// `Button` doesn't accept `style`, so we wrap the footer Buttons in flex
// `<View>`s to share width between Atla and Devam (1:2 ratio when both
// present, 1:1 when Devam-only).

import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { colors } from '../../theme/colors';

export const OB_STEPS = [
  'name',
  'phone',
  'pronoun',
  'category',
  'year',
  'department',
  'level',
  'hand',
  'availability',
  'photo',
] as const;

export type OBStepName = (typeof OB_STEPS)[number];

export interface OBFrameProps {
  step: OBStepName;
  title: string;
  subtitle?: string;
  children: ReactNode;
  canNext?: boolean;
  nextLabel?: string;
  onNext: () => void;
  onSkip?: () => void;
}

export function OBFrame({
  step,
  title,
  subtitle,
  children,
  canNext = true,
  nextLabel = 'Devam',
  onNext,
  onSkip,
}: OBFrameProps) {
  const idx = OB_STEPS.indexOf(step);
  const total = OB_STEPS.length;
  const pct = ((idx + 1) / total) * 100;

  return (
    <View className="flex-1 bg-bg">
      {/* Progress header */}
      <View
        style={{
          paddingHorizontal: 18,
          paddingTop: 4,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            backgroundColor: colors.surface2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel="Geri"
        >
          <Icon name="back" size={20} color={colors.text} />
        </Pressable>
        <View
          style={{
            flex: 1,
            height: 6,
            backgroundColor: colors.surface2,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${pct}%`,
              height: '100%',
              backgroundColor: colors.clay,
              borderRadius: 3,
            }}
          />
        </View>
        <Text
          className="font-num font-bold text-text-3"
          style={{ fontSize: 12.5 }}
        >
          {idx + 1}/{total}
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: 8,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          className="font-display font-extrabold text-text"
          style={{ fontSize: 26, marginBottom: 8, letterSpacing: -0.52 }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            className="font-sans text-text-2"
            style={{ fontSize: 15, lineHeight: 23, marginBottom: 26 }}
          >
            {subtitle}
          </Text>
        )}
        {children}
      </ScrollView>

      {/* Footer */}
      <View
        style={{
          padding: 24,
          paddingTop: 8,
          flexDirection: 'row',
          gap: 10,
        }}
      >
        {onSkip && (
          <View style={{ flex: 1 }}>
            <Button variant="secondary" size="lg" full onPress={onSkip}>
              Atla
            </Button>
          </View>
        )}
        <View style={{ flex: onSkip ? 2 : 1 }}>
          <Button size="lg" disabled={!canNext} onPress={onNext} full>
            {nextLabel}
          </Button>
        </View>
      </View>
    </View>
  );
}
