// −/+ control for one side of a live match.
//
// Replaces the pair of big "Sana sayı" / "Rakibe sayı" cards. Those cards sat
// below the score, so which row a tap belonged to was inferred from a label —
// and the labels lied: "Sana sayı" always awarded team A, so a team-B player
// scored for their opponent every time they tapped.
//
// Putting the control IN the player's row removes the inference: the number you
// change is the number you are looking at. It also gives each side its own
// "take back", which the single global "Geri Al" could not — that reversed
// whichever side scored last, so correcting your own mistake could delete your
// opponent's game.

import { Pressable, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { Icon } from './Icon';

export interface ScoreStepperProps {
  /** Current unit count for this side. */
  value: number;
  /** Highlight this side as the reader's own. */
  mine?: boolean;
  /** Whose score this is, for screen readers ("Sen", "Yunus Emre"). */
  ownerLabel: string;
  /** What one step adds, for screen readers ("oyun", "sayı", "set"). */
  unitLabel: string;
  onIncrement: () => void;
  onDecrement: () => void;
  /** Both controls off — the match has already ended. */
  disabled?: boolean;
}

const BTN = 44; // iOS minimum touch target

function StepButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'plus' | 'x';
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className="items-center justify-center rounded-md active:opacity-70"
      // Plain object: NativeWind's interop spreads the style prop, and
      // spreading a function yields {} — every rule would be dropped silently.
      style={{
        width: BTN,
        height: BTN,
        borderWidth: 1.5,
        borderColor: colors.borderStrong,
        backgroundColor: colors.surface,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {icon === 'plus' ? (
        <Icon name="plus" size={20} color={colors.text} stroke={2.6} />
      ) : (
        // No dedicated minus glyph in the registry; a 2px rule reads as one
        // and stays crisp at any scale.
        <View style={{ width: 15, height: 2.4, borderRadius: 2, backgroundColor: colors.text2 }} />
      )}
    </Pressable>
  );
}

export function ScoreStepper({
  value,
  mine,
  ownerLabel,
  unitLabel,
  onIncrement,
  onDecrement,
  disabled = false,
}: ScoreStepperProps) {
  return (
    <View className="flex-row items-center" style={{ gap: 10 }}>
      <StepButton
        icon="x"
        label={`${ownerLabel}: bir ${unitLabel} geri al`}
        onPress={onDecrement}
        disabled={disabled || value === 0}
      />
      <Text
        className="font-num font-extrabold"
        accessibilityLabel={`${ownerLabel}: ${value} ${unitLabel}`}
        style={{
          minWidth: 40,
          textAlign: 'center',
          fontSize: 36,
          color: mine ? colors.court : colors.text,
        }}
      >
        {value}
      </Text>
      <StepButton
        icon="plus"
        label={`${ownerLabel}: bir ${unitLabel} ekle`}
        onPress={onIncrement}
        disabled={disabled}
      />
    </View>
  );
}
