// hooks/use-share-card.ts — Plan 8 Share Cards.
//
// Returns a ref to attach to a ViewShot and an async share() that captures
// the view to PNG and calls expo-sharing's native share sheet.
//
// Pattern:
//   const { ref, share } = useShareCard();
//   <ViewShot ref={ref}>...</ViewShot>
//   <Button onPress={share}>Paylaş</Button>

import { useRef } from 'react';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import type { MutableRefObject } from 'react';

export interface UseShareCardReturn {
  /** Attach this ref to the <ViewShot> (or any View) you want to capture. */
  ref: MutableRefObject<null>;
  /** Capture the ref to PNG and open the native share sheet. No-ops gracefully when sharing is not available. */
  share: () => Promise<void>;
}

export function useShareCard(): UseShareCardReturn {
  const ref = useRef(null);

  const share = async (): Promise<void> => {
    try {
      // Guard: sharing not available (e.g., web/simulator without share support)
      const available = await Sharing.isAvailableAsync();
      if (!available) return;

      const uri = await captureRef(ref, {
        format: 'png',
        quality: 1,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'ChallengeBu!'
      });
    } catch {
      // Silently swallow errors (user cancel, capture failure, etc.)
    }
  };

  return { ref, share };
}
