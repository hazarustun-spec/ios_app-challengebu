import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export async function pickAvatar(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('İzin gerekli', 'Avatar seçebilmek için galeri erişimi vermelisin.');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: false,
  });
  if (res.canceled || res.assets.length === 0) return null;
  return res.assets[0].uri;
}
