// Onboarding wizard state — Plan 8 Phase D5-D14.
//
// Accumulates the 10-step OBFrame wizard's draft until submission. The shape
// is intentionally flat (no `draft` wrapper) so each screen can call
// `setField('key', value)` without spreading the entire object. Persistence
// uses expo-secure-store so kill-and-relaunch resumes mid-wizard — the
// session also survives across app updates.
//
// Field naming mirrors the design bundle (`screens-onboarding.jsx`):
//   - `category` → erkek | kadin | open_only (sıralama uygunluğu)
//   - `level`    → baslangic | orta | ileri (kendi değerlendirmesi)
//   - `hand`     → sag | sol (dominant el)
//   - `availability` → ['wd_am','wd_noon','wd_eve','we_am','we_noon','we_eve']
//
// The submission hook (`use-submit-onboarding.ts`) maps these to the
// canonical Supabase column names (`gender_category`, `skill_self_assessment`,
// `dominant_hand`, `availability_windows`, …).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

export type Pronoun = 'he/him' | 'she/her' | 'they/them' | 'other';
export type GenderCategory = 'erkek' | 'kadin' | 'open_only';
export type ClassYear = 'hazirlik' | '1' | '2' | '3' | '4' | 'yl' | 'doktora' | 'mezun';
export type SkillLevel = 'baslangic' | 'orta' | 'ileri';
export type DominantHand = 'sag' | 'sol';
export type AvailabilitySlot =
  | 'wd_am'
  | 'wd_noon'
  | 'wd_eve'
  | 'we_am'
  | 'we_noon'
  | 'we_eve';

export interface OnboardingState {
  firstName: string;
  lastName: string;
  phone: string | null;
  pronoun: Pronoun | null;
  category: GenderCategory | null;
  departmentId: string | null;
  departmentName: string;
  showDepartment: boolean;
  classYear: ClassYear | null;
  showClassYear: boolean;
  level: SkillLevel | null;
  hand: DominantHand | null;
  availability: AvailabilitySlot[];
  photoUri: string | null;

  setField<K extends keyof OnboardingFields>(key: K, value: OnboardingFields[K]): void;
  reset(): void;
}

type OnboardingFields = Omit<OnboardingState, 'setField' | 'reset'>;

const INITIAL: OnboardingFields = {
  firstName: '',
  lastName: '',
  phone: null,
  pronoun: null,
  category: null,
  departmentId: null,
  departmentName: '',
  showDepartment: true,
  classYear: null,
  showClassYear: true,
  level: null,
  hand: null,
  availability: [],
  photoUri: null,
};

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...INITIAL,
      setField: (key, value) => set((s) => ({ ...s, [key]: value })),
      reset: () => set(INITIAL),
    }),
    {
      name: 'onboarding-draft',
      storage: createJSONStorage(() => secureStorage),
      // Don't persist the function refs.
      partialize: (s) => ({
        firstName: s.firstName,
        lastName: s.lastName,
        phone: s.phone,
        pronoun: s.pronoun,
        category: s.category,
        departmentId: s.departmentId,
        departmentName: s.departmentName,
        showDepartment: s.showDepartment,
        classYear: s.classYear,
        showClassYear: s.showClassYear,
        level: s.level,
        hand: s.hand,
        availability: s.availability,
        photoUri: s.photoUri,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Resume helper
// ---------------------------------------------------------------------------

/** Onboarding route paths (a subset of valid Expo Router hrefs). */
export type OBRoute =
  | '/(onboarding)/name'
  | '/(onboarding)/phone'
  | '/(onboarding)/pronoun'
  | '/(onboarding)/category'
  | '/(onboarding)/year'
  | '/(onboarding)/department'
  | '/(onboarding)/level'
  | '/(onboarding)/hand'
  | '/(onboarding)/availability'
  | '/(onboarding)/photo'
  | '/(onboarding)/done';

/**
 * Given a persisted draft, returns the Expo Router href for the FIRST step
 * whose required field is still unset. phone and photo are optional (skippable)
 * so they are always considered complete. If every required field is filled,
 * returns `/(onboarding)/done` so the user can confirm and submit.
 */
export function firstIncompleteStep(
  draft: Omit<OnboardingState, 'setField' | 'reset'>,
): OBRoute {
  if (!draft.firstName.trim() || !draft.lastName.trim()) return '/(onboarding)/name';
  // phone is optional — always treated as complete
  if (!draft.pronoun) return '/(onboarding)/pronoun';
  if (!draft.category) return '/(onboarding)/category';
  if (!draft.classYear) return '/(onboarding)/year';
  if (!draft.departmentId) return '/(onboarding)/department';
  if (!draft.level) return '/(onboarding)/level';
  if (!draft.hand) return '/(onboarding)/hand';
  if (draft.availability.length === 0) return '/(onboarding)/availability';
  // photo is optional — always treated as complete
  return '/(onboarding)/done';
}
