import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { env } from './env';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// `autoRefreshToken` alone is not enough on React Native. The refresh timer is
// a JS interval, and the OS suspends it the moment the app leaves the
// foreground — so a session that would have refreshed happily while the app was
// open silently expires in the background. The refresh token is still valid;
// nobody is spending it. The user comes back to a dead access token and gets
// bounced to sign-in, which on an OTP-only app means waiting for another
// mailed code.
//
// Supabase's own React Native guidance is to drive the timer off AppState:
// resume refreshing on foreground, stop it on background so we are not holding
// a timer the OS will kill anyway.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

// AppState only fires on *changes*, so a cold start never triggers the handler
// above — start the timer once here for the foreground the app launches into.
supabase.auth.startAutoRefresh();
