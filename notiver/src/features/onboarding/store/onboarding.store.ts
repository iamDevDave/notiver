import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'onboarding-storage' });

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

/**
 * MMKV-backed store for onboarding completion state.
 * Uses direct MMKV access for synchronous reads (no async overhead).
 */
export const onboardingStore = {
  /** Check if onboarding has been completed */
  isCompleted(): boolean {
    return storage.getBoolean(ONBOARDING_COMPLETED_KEY) ?? false;
  },

  /** Mark onboarding as completed */
  markCompleted(): void {
    storage.set(ONBOARDING_COMPLETED_KEY, true);
  },

  /** Reset onboarding state (useful for testing/debug) */
  reset(): void {
    storage.remove(ONBOARDING_COMPLETED_KEY);
  },
};
