// Welcome (first) screen.
//
// Ports "Welcome Hero.html" from the user's Claude Design project
// (claude.ai/design, project "tennis-challenger"): a full-bleed photo hero
// (hand tossing a tennis ball against open sky) with a small ball-mark logo
// over it, and the headline/CTA living below the card instead of inside it.
//
// The design's own bottom note reads "...Boğaziçi hesapları" (naming the
// university). Kept the existing generic "üniversite hesapları" copy instead —
// the current App Review notes state explicitly that no university name is
// used anywhere in the app or its metadata, specifically so the university
// email domain check reads as access control rather than a claim of
// affiliation. Swapping in the named copy here would contradict that on file.

import { router } from 'expo-router';
import { Image, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';

// Small ball-mark badge over the hero photo's top-right corner.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
<circle cx="20" cy="20" r="16" fill="#F2DE3A" stroke="#FFFFFF" stroke-width="3"/>
<path d="M9 11 A 22 22 0 0 1 9 29 M31 11 A 22 22 0 0 0 31 29" fill="none" stroke="#FFFFFF" stroke-width="2.6"/>
</svg>`;

export default function Welcome() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-bg"
      style={{
        paddingTop: 8 + insets.top,
        paddingHorizontal: 18,
        paddingBottom: 24,
      }}
    >
      {/* Photo card. flex:1 — like the illustration it replaces, it fills
          whatever height the headline/CTA block below leaves behind, so a
          short iPad-compatibility-mode window shrinks the photo instead of
          pushing the headline off-screen. */}
      <View
        style={{
          flex: 1,
          minHeight: 0,
          borderRadius: 30,
          overflow: 'hidden',
          backgroundColor: colors.court,
        }}
      >
        <Image
          source={require('../../assets/welcome-hero.png')}
          resizeMode="cover"
          style={{ width: '100%', height: '100%' }}
          accessibilityIgnoresInvertColors
        />
        <View style={{ position: 'absolute', top: 18, right: 18 }}>
          <SvgXml xml={LOGO_SVG} width={40} height={40} />
        </View>
      </View>

      <Text
        className="font-display font-extrabold"
        adjustsFontSizeToFit
        numberOfLines={3}
        style={{
          color: colors.text,
          fontSize: 40,
          lineHeight: 41,
          letterSpacing: -1.2,
          marginTop: 24,
        }}
      >
        Meydan oku. <Text style={{ color: '#83C72A' }}>★</Text>
        {'\nTırman.\nŞampiyon ol.'}
      </Text>
      <Text
        className="font-sans font-medium"
        style={{ color: '#5A5A52', fontSize: 14.5, lineHeight: 21, marginTop: 11 }}
      >
        Tenis sıralaması, maçlar ve sezonlar — hepsi tek platformda.
      </Text>

      <View style={{ marginTop: 18, gap: 10 }}>
        <Button full size="lg" variant="dark" onPress={() => router.push('/(auth)/sign-in')}>
          Üniversite e-postanla başla
        </Button>
        <Text
          className="font-sans font-medium"
          style={{ color: '#8A8A82', fontSize: 12, textAlign: 'center' }}
        >
          Öğrenci, akademisyen ve mezun üniversite hesapları.
        </Text>
      </View>
    </View>
  );
}
