import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

export type PronounValue = 'he/him' | 'she/her' | 'they/them' | 'other';
export type GenderCategoryValue = 'erkek' | 'kadin' | 'open_only';
export type ClassYearValue = 'hazirlik' | '1' | '2' | '3' | '4' | 'yl' | 'doktora';
export type SkillValue = 'baslangic' | 'orta' | 'ileri';
export type HandValue = 'sag' | 'sol';
export type AvailabilityValue =
  | 'weekday_morning' | 'weekday_noon' | 'weekday_evening'
  | 'weekend_morning' | 'weekend_noon' | 'weekend_evening';

export interface OnboardingDraft {
  firstName: string;
  lastName: string;
  phone?: string;
  pronoun?: PronounValue;
  pronounCustom?: string;
  genderCategory?: GenderCategoryValue;
  departmentId?: string;
  classYear?: ClassYearValue;
  showDepartment: boolean;
  showClassYear: boolean;
  skillSelfAssessment?: SkillValue;
  dominantHand?: HandValue;
  availabilityWindows: AvailabilityValue[];
  avatarUri?: string;
}

const initialDraft: OnboardingDraft = {
  firstName: '',
  lastName: '',
  showDepartment: true,
  showClassYear: true,
  availabilityWindows: [],
};

interface State {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  reset: () => void;
}

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const useOnboardingStore = create<State>()(
  persist(
    (set) => ({
      draft: initialDraft,
      update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      reset: () => set({ draft: initialDraft }),
    }),
    {
      name: 'onboarding-draft',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);
