import { Redirect } from 'expo-router';

import { onboardingStore } from '@/src/features/onboarding/store/onboarding.store';

export default function Index() {
  return <Redirect href={onboardingStore.isCompleted() ? '/(tabs)' : '/permissions'} />;
}
