// Elevation tokens — tasteful depth for cards/heroes. Plan-8 is intentionally
// flat, so keep these SUBTLE (low opacity, soft radius). iOS reads shadow*,
// Android reads elevation. Spread via `style={shadows.md}`.

import type { ViewStyle } from 'react-native';

export const shadows: Record<'sm' | 'md' | 'lg' | 'hero', ViewStyle> = {
  // Resting cards — barely-there lift off the background.
  sm: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  // Default card depth.
  md: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  // Raised surfaces (sheets, sticky bars).
  lg: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  // Hero cards — a soft, colored-ready glow base (pair with the card's tint).
  hero: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 8,
  },
};
