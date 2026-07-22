// One-shot UI flags that must survive kill/relaunch (e.g. "has the user seen
// the ELO explainer yet?"). Same SecureStore-backed persistence as the
// onboarding store, kept separate so it isn't wiped when the onboarding draft
// resets.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

interface UiFlagsState {
  /** Whether the first-launch ELO explainer has been shown. */
  eloExplainerSeen: boolean;
  markEloExplainerSeen: () => void;
  /** True until the persisted value has been rehydrated from storage. */
  _hydrated: boolean;
}

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const useUiFlagsStore = create<UiFlagsState>()(
  persist(
    (set) => ({
      eloExplainerSeen: false,
      markEloExplainerSeen: () => set({ eloExplainerSeen: true }),
      _hydrated: false,
    }),
    {
      name: 'ui-flags',
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({ eloExplainerSeen: s.eloExplainerSeen }),
      onRehydrateStorage: () => () => {
        // Flip the hydration guard once storage has loaded so consumers don't
        // flash the first-launch sheet before the persisted value arrives.
        useUiFlagsStore.setState({ _hydrated: true });
      },
    },
  ),
);
