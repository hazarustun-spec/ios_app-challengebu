import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { Button } from '../../components/ui/Button';
import { useSubmitOnboarding } from '../../hooks/use-submit-onboarding';
import { useAuthStore } from '../../stores/auth-store';
import { useOnboardingStore } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;

export default function AvatarScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const reset = useOnboardingStore((s) => s.reset);
  const setProfile = useAuthStore((s) => s.setProfile);
  const user = useAuthStore((s) => s.user);
  const [uri, setUri] = useState(draft.avatarUri);

  const submit = useSubmitOnboarding();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setUri(result.assets[0].uri);
      update({ avatarUri: result.assets[0].uri });
    }
  };

  const handleFinish = () => {
    submit.mutate(
      { draft: { ...draft, avatarUri: uri } },
      {
        onSuccess: () => {
          if (user) {
            setProfile({
              userId: user.id,
              firstName: draft.firstName,
              lastName: draft.lastName,
              role: 'player',
              onboardingComplete: true,
            });
          }
          reset();
          router.replace('/(app)/home');
        },
        onError: (err) => {
          Alert.alert('Hata', err instanceof Error ? err.message : 'Profil oluşturulamadı');
        },
      },
    );
  };

  return (
    <StepLayout
      step={11}
      total={TOTAL_STEPS}
      title="Profil fotoğrafı"
      subtitle="Opsiyonel — kortta birbirimizi tanıyalım"
      onNext={handleFinish}
      nextLoading={submit.isPending}
      nextLabel="Bitir"
    >
      <View className="items-center">
        {uri ? (
          <Image source={{ uri }} className="h-48 w-48 rounded-full bg-gray-200" />
        ) : (
          <View className="h-48 w-48 items-center justify-center rounded-full bg-gray-200">
            <Text className="text-5xl">📷</Text>
          </View>
        )}
        <View className="mt-6 w-full gap-3">
          <Button onPress={pickImage} variant="secondary">
            Fotoğraf seç
          </Button>
          {uri && (
            <Button onPress={() => { setUri(undefined); update({ avatarUri: undefined }); }} variant="ghost">
              Fotoğrafı kaldır
            </Button>
          )}
        </View>
      </View>
    </StepLayout>
  );
}
