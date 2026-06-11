// Onboarding · Profil fotoğrafı (D14) — optional uploader
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-onboarding.jsx — ObPhoto
//
// Next step (`/(onboarding)/done` — D15) ships in the next batch; until then
// tapping "Bitir" or "Atla" routes to a not-yet-mounted screen. Wire-up of
// final submission moves into D15.

import { Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { OBFrame } from '../../components/onboarding/OBFrame';
import { Icon } from '../../components/ui/Icon';
import { useOnboardingStore } from '../../stores/onboarding-store';
import { colors } from '../../theme/colors';

export default function ObPhoto() {
  const photoUri = useOnboardingStore((s) => s.photoUri);
  const setField = useOnboardingStore((s) => s.setField);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets[0]) {
      setField('photoUri', res.assets[0].uri);
    }
  };

  return (
    <OBFrame
      step="photo"
      title="Profil fotoğrafı"
      subtitle="Opsiyonel — rakiplerin seni tanısın. İstemezsen baş harflerin gösterilir."
      nextLabel="Bitir"
      onSkip={() => {
        setField('photoUri', null);
        router.push('/(onboarding)/done' as never);
      }}
      onNext={() => router.push('/(onboarding)/done' as never)}
    >
      <View style={{ alignItems: 'center', gap: 16, paddingVertical: 10 }}>
        <Pressable onPress={pick} style={{ position: 'relative' }}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={{
                width: 120,
                height: 120,
                borderRadius: 34,
                backgroundColor: colors.surface2,
              }}
            />
          ) : (
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 34,
                backgroundColor: colors.surface2,
                borderWidth: 2,
                borderColor: colors.borderStrong,
                borderStyle: 'dashed',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="camera" size={34} color={colors.text3} />
            </View>
          )}
          <View
            style={{
              position: 'absolute',
              right: -4,
              bottom: -4,
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: colors.clay,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: colors.bg,
            }}
          >
            <Icon name="plus" size={18} color="#FFFFFF" stroke={2.6} />
          </View>
        </Pressable>
        <Pressable onPress={pick}>
          <Text
            className="font-sans font-bold"
            style={{ fontSize: 14, color: colors.clay }}
          >
            {photoUri ? 'Fotoğrafı değiştir' : 'Fotoğraf yükle'}
          </Text>
        </Pressable>
      </View>
    </OBFrame>
  );
}
