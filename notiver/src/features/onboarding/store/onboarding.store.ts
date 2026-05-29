/**
 * Temporary onboarding store for Expo Go.
 * Replace with MMKV again when using a Development Build.
 */

let onboardingCompleted = false;

export const onboardingStore = {
  isCompleted(): boolean {
    return onboardingCompleted;
  },

  markCompleted(): void {
    onboardingCompleted = true;
  },

  reset(): void {
    onboardingCompleted = false;
  },
};