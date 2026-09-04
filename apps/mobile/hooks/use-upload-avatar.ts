import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

/**
 * Normalize a picked image (HEIC/PNG/JPEG at whatever resolution the camera
 * returned) down to a 512-wide JPEG. Two things matter:
 *   - contentType is always image/jpeg — the storage row's MIME is truthful
 *     even when the source was HEIC or the ext string was garbage.
 *   - the base64 blob we later load into memory tops out around ~50 KB
 *     instead of the 20 MB an unmodified iPhone HEIC can weigh, keeping
 *     `readAsStringAsync` from OOMing on older devices.
 */
async function normalizeAvatar(localUri: string): Promise<string> {
  const out = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 512 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );
  return out.uri;
}

export function useUploadAvatar() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { localUri: string }) => {
      if (!userId) throw new Error('Oturum bulunamadı');
      const fileName = `${userId}.jpg`;
      const normalizedUri = await normalizeAvatar(input.localUri);
      const base64 = await FileSystem.readAsStringAsync(normalizedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (uploadErr) throw uploadErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const cacheBustedUrl = `${pub.publicUrl}?t=${Date.now()}`;
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ avatar_url: cacheBustedUrl })
        .eq('user_id', userId);
      if (profileErr) throw profileErr;
      return { url: cacheBustedUrl };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
