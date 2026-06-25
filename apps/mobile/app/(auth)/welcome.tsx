// Welcome (first) screen.
//
// Ports the "Tennis Hero Options" design from the user's Claude Design project:
// a green hero card with the BÜ-LADDER badge, a tennis-ball-cluster logo, a
// racket + ball + net illustration, the hero headline, and the BÜ-email CTA.
// The two illustrations are rendered as SVG via react-native-svg's <SvgXml>.

import { useEffect } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
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

// Court baseline + net + airborne ball + racket resting against the net.
const ILLO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 362 348" preserveAspectRatio="xMidYMid meet">
<defs>
<pattern id="netmesh" width="11" height="11" patternUnits="userSpaceOnUse">
<rect width="11" height="11" fill="#2170BC"/>
<path d="M0 0 H11 M0 0 V11" stroke="#6aa6dd" stroke-width="1.4"/>
</pattern>
<pattern id="strings2" width="13" height="13" patternUnits="userSpaceOnUse">
<path d="M0 0 V13 M0 0 H13" stroke="#cfe0ff" stroke-width="1.8"/>
</pattern>
</defs>
<line x1="-12" y1="88" x2="374" y2="52" stroke="#ffffff" stroke-width="7" opacity="0.85"/>
<rect x="0" y="252" width="362" height="74" fill="url(#netmesh)"/>
<rect x="0" y="244" width="362" height="8" fill="#ffffff"/>
<rect x="4" y="238" width="6" height="92" fill="#ffffff"/>
<rect x="352" y="238" width="6" height="92" fill="#ffffff"/>
<rect x="178" y="244" width="7" height="82" fill="#ffffff"/>
<ellipse cx="268" cy="186" rx="26" ry="7" fill="#2170BC" opacity="0.38"/>
<g>
<circle cx="268" cy="98" r="24" fill="#F2DE3A" stroke="#2170BC" stroke-width="3"/>
<path d="M247 93 C257 112 279 112 289 93" fill="none" stroke="#2170BC" stroke-width="3" stroke-linecap="round"/>
</g>
<g transform="translate(166,128) rotate(-38) scale(0.40)">
<g transform="translate(22,30)" fill="#2170BC" opacity="0.85">
<ellipse cx="0" cy="0" rx="168" ry="206"/>
<rect x="-26" y="240" width="52" height="236" rx="26"/>
</g>
<ellipse cx="0" cy="0" rx="168" ry="206" fill="#ffffff"/>
<ellipse cx="0" cy="0" rx="144" ry="182" fill="#2170BC"/>
<ellipse cx="0" cy="0" rx="144" ry="182" fill="url(#strings2)"/>
<path d="M -66 148 L 66 148 L 30 272 L -30 272 Z" fill="#ffffff"/>
<path d="M -42 166 L 42 166 L 0 252 Z" fill="#2170BC"/>
<rect x="-26" y="250" width="52" height="236" rx="26" fill="#EC5C2B"/>
<rect x="-26" y="250" width="52" height="22" fill="#ffffff"/>
</g>
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

        {/* Illustration */}
        <View style={{ alignItems: 'center', marginVertical: 6 }}>
          <SvgXml xml={ILLO_SVG} width={illoW} height={illoH} />
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
          Öğrenci, akademisyen ve mezun Boğaziçi hesapları.
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
