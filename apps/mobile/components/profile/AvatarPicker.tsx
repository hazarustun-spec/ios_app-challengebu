import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const PICK_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
  base64: false,
};

/**
 * Lets the user add a profile photo by taking one with the camera or choosing
 * from the photo library. Prompts for the matching permission, then returns the
 * picked (square-cropped) image URI — or null if the user cancels or denies.
 */
export async function pickAvatar(): Promise<string | null> {
  const source = await new Promise<'camera' | 'library' | null>((resolve) => {
    Alert.alert(
      'Profil fotoğrafı',
      'Fotoğrafı nasıl eklemek istersin?',
      [
        { text: 'Kamera ile çek', onPress: () => resolve('camera') },
        { text: 'Galeriden seç', onPress: () => resolve('library') },
        { text: 'İptal', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
  if (!source) return null;

  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf çekebilmek için kamera erişimi vermelisin.');
      return null;
    }
    const res = await ImagePicker.launchCameraAsync(PICK_OPTIONS);
    if (res.canceled || res.assets.length === 0) return null;
    return res.assets[0].uri;
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('İzin gerekli', 'Galeriden seçebilmek için galeri erişimi vermelisin.');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync(PICK_OPTIONS);
  if (res.canceled || res.assets.length === 0) return null;
  return res.assets[0].uri;
}
