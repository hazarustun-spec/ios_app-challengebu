// Welcome (first) screen.
//
// Ports the "Tennis Hero Options" design from the user's Claude Design project:
// a green hero card with the LADDER badge, a tennis-ball-cluster logo, a hero
// image, the hero headline, and the university-email CTA.
//
// The racket + ball + net SVG illustration that used to fill the middle slot
// was replaced with a photograph. The logo is still drawn as SVG via
// react-native-svg's <SvgXml>.

import { useEffect } from 'react';
import { Image, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { Button } from '../../components/ui/Button';

const HERO_GREEN = '#83C72A';

// Ball-cluster + smiley logo (top-right of the hero).
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 88">
<g fill="#66A41F">
<circle cx="34" cy="50" r="22"/><circle cx="58" cy="44" r="26"/>
<circle cx="74" cy="58" r="18"/><circle cx="48" cy="62" r="20"/>
</g>
<circle cx="64" cy="40" r="20" fill="#ffffff" stroke="#2170BC" stroke-width="2.5"/>
<path d="M48 36 C56 46 72 46 80 36" fill="none" stroke="#2170BC" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;


export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Illustration spans the hero card's inner width (screen − outer padding).
  const illoW = width - 36;
  const illoH = illoW * (348 / 362);

  return (
    <View
      className="flex-1 bg-bg"
      style={{
        paddingTop: 8 + insets.top,
        paddingHorizontal: 18,
        paddingBottom: 24,
      }}
    >
      <View
        className="flex-1 overflow-hidden"
        style={{
          backgroundColor: HERO_GREEN,
          borderRadius: 30,
          paddingHorizontal: 22,
          paddingTop: 22,
          paddingBottom: 30,
          justifyContent: 'space-between',
        }}
      >
        {/* Top row: badge + floating logo */}
        <View className="flex-row items-start justify-between">
          <View
            style={{
              backgroundColor: '#35631A',
              paddingHorizontal: 15,
              paddingVertical: 8,
              borderRadius: 9999,
            }}
          >
            <Text
              className="font-display font-extrabold"
              style={{ color: '#EAF7D0', fontSize: 11, letterSpacing: 1.4 }}
            >
              CHALLENGEBU! · LADDER
            </Text>
          </View>
          <FloatyLogo />
        </View>

        {/* Hero photo.
            Sits directly on HERO_GREEN, and the sky in the photo is a strong
            blue — the two colours meeting edge-to-edge read as a clash, so the
            image is inset in a rounded card with a white hairline to separate
            them. The source is square and the slot is 362:348, so `cover`
            trims a sliver off the top and bottom rather than distorting. */}
        <View style={{ alignItems: 'center', marginVertical: 6 }}>
          <Image
            source={require('../../assets/welcome-hero.jpg')}
            style={{
              width: illoW,
              height: illoH,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.9)',
            }}
            resizeMode="cover"
            accessible
            accessibilityRole="image"
            accessibilityLabel="Havaya atılmış tenis topunu karşılayan el"
          />
        </View>

        {/* Hero text */}
        <View>
          <Text
            className="text-white font-display font-extrabold"
            style={{ fontSize: 40, lineHeight: 39, letterSpacing: -1.2 }}
          >
            {'Meydan oku. ★\nTırman.\nŞampiyon ol.'}
          </Text>
          <Text
            className="font-sans font-bold"
            style={{
              color: 'rgba(255,255,255,0.95)',
              fontSize: 14.5,
              marginTop: 14,
              lineHeight: 21,
              maxWidth: 290,
            }}
          >
            Tenis sıralaması, maçlar ve sezonlar — hepsi tek platformda.
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 16, gap: 10 }}>
        <Button full size="lg" arrow onPress={() => router.push('/(auth)/sign-in')}>
          Üniversite e-postanla başla
        </Button>
        <Text
          className="font-sans font-semibold text-text-3"
          style={{ fontSize: 12.5, textAlign: 'center', lineHeight: 19 }}
        >
          Öğrenci, akademisyen ve mezun üniversite hesapları.
        </Text>
      </View>
    </View>
  );
}

function FloatyLogo() {
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withTiming(-7, { duration: 2000, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true,
    );
  }, [y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View style={style}>
      <SvgXml xml={LOGO_SVG} width={92} height={84} />
    </Animated.View>
  );
}
