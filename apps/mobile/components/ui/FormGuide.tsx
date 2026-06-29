// components/ui/FormGuide.tsx — Plan 8
//
// Compact row of small colored pills showing recent match results.
// Ordered oldest→newest (leftmost = oldest, rightmost = most recent).
//
// W (Galibiyet) → win green (#5C8C1E),  letter "G", white text
// L (Mağlubiyet) → loss red (#E0463C),   letter "M", white text
// V (Void/Bozuk) → warn amber (#E0992B), letter "B", dark text

import { Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export type FormResult = 'W' | 'L' | 'V';

export interface FormGuideProps {
  /** Match results in oldest→newest order (leftmost = oldest). */
  results: FormResult[];
  /** Diameter of each pill in dp. Defaults to 22. */
  size?: number;
}

const CONFIG: Record<FormResult, { bg: string; letter: string; textColor: string }> = {
  W: { bg: colors.win,  letter: 'G', textColor: '#FFFFFF' },
  L: { bg: colors.loss, letter: 'M', textColor: '#FFFFFF' },
  V: { bg: colors.warn, letter: 'B', textColor: colors.text },
};

export function FormGuide({ results, size = 22 }: FormGuideProps) {
  if (results.length === 0) return null;

  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {results.map((r, i) => {
        const { bg, letter, textColor } = CONFIG[r];
        return (
          <View
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              className="font-sans font-bold"
              style={{
                fontSize: Math.round(size * 0.46),
                color: textColor,
                textAlign: 'center',
              }}
            >
              {letter}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
