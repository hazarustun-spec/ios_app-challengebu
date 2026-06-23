// components/share/ShareSheet.tsx — Plan 8 Share Cards.
//
// A modal bottom sheet that renders a scaled-down preview of any share card,
// with a "Paylaş" button that captures the card at full resolution and opens
// the native share sheet.
//
// Architecture:
//   - The Sheet (existing primitive) provides modal chrome + backdrop.
//   - A visible scaled preview lets the user see the card before sharing.
//   - A hidden off-screen full-size View (positioned via opacity:0 / pointerEvents
//     none) is what captureRef actually renders to PNG — this avoids capturing
//     the CSS transform and gets the true 1080×1920 resolution.
//
// Usage:
//   <ShareSheet visible={open} onClose={() => setOpen(false)} title="…">
//     <CardMatchResult {...props} />
//   </ShareSheet>

import type { ReactNode } from 'react';
import { useRef } from 'react';
import { Dimensions, Pressable, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { colors } from '../../theme/colors';

export interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The card component to render (CardMatchResult, CardEloProgress, or CardBadgeWon). */
  children: ReactNode;
  /** Optional title for the sheet header. */
  title?: string;
}

// Card design dimensions (matches StoryShell in HTML spec)
const DESIGN_W = 1080;
const DESIGN_H = 1920;

export function ShareSheet({
  visible,
  onClose,
  children,
  title = 'Kartı Paylaş',
}: ShareSheetProps) {
  // Ref on the full-size off-screen view for capture
  const captureViewRef = useRef<View>(null);

  const { width: screenWidth } = Dimensions.get('window');

  // Preview: fit the 1080×1920 card into ~80% of screen width at fixed
  // aspect ratio. Capped at 300pt wide to leave room for action buttons.
  const previewWidth = Math.min(screenWidth * 0.78, 300);
  const previewHeight = (previewWidth / DESIGN_W) * DESIGN_H;
  const scale = previewWidth / DESIGN_W;

  const handleShare = async () => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) return;

      // Capture the hidden full-size view (no transform distortion)
      const uri = await captureRef(captureViewRef, {
        format: 'png',
        quality: 1,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Tennis Challenger',
      });
    } catch {
      // Swallow: user cancel, simulator unavailability, etc.
    }
  };

  return (
    <>
      {/* Hidden full-size capture target — off screen, zero opacity, no pointer events */}
      <View
        ref={captureViewRef}
        style={{
          position: 'absolute',
          top: -DESIGN_H - 100,
          left: 0,
          width: DESIGN_W,
          height: DESIGN_H,
          opacity: 0,
        }}
        pointerEvents="none"
      >
        {children}
      </View>

      <Sheet visible={visible} onClose={onClose} title={title} grabHandle>
        <View style={{ alignItems: 'center', paddingBottom: 12 }}>
          {/* Scaled preview — clip to visible card size */}
          <View
            style={{
              width: previewWidth,
              height: previewHeight,
              borderRadius: 12,
              overflow: 'hidden',
              borderWidth: 1.5,
              borderColor: colors.borderStrong,
              marginBottom: 20,
            }}
          >
            {/* Full-size card scaled down via transform origin top-left */}
            <View
              style={{
                width: DESIGN_W,
                height: DESIGN_H,
                // Scale from the top-left corner so the 1080×1920 card fills the
                // preview box. (RN applies a bare {scale} from the center, and a
                // translate after it lands in scaled space — which left the card
                // mostly outside the box, rendering blank. transformOrigin is
                // supported on RN 0.74+.)
                transform: [{ scale }],
                transformOrigin: 'top left',
              }}
            >
              {children}
            </View>
          </View>

          {/* Action row */}
          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              style={{
                flex: 1,
                height: 52,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: colors.borderStrong,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="x" size={20} color={colors.text} />
            </Pressable>

            <View style={{ flex: 2.5 }}>
              <Button
                size="lg"
                full
                icon={
                  <Icon name="share" size={18} color={colors.onLime} stroke={2} />
                }
                onPress={handleShare}
              >
                Paylaş
              </Button>
            </View>
          </View>
        </View>
      </Sheet>
    </>
  );
}
