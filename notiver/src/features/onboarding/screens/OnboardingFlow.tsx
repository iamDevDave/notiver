import { useRouter } from 'expo-router';
import { BarChart3, Brain, Cloud, Sparkles, Zap } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, useWindowDimensions, View, type ViewToken } from 'react-native';

import { Button } from '@/src/shared/components/atoms/Button';
import { colors } from '@/src/theme/tokens';
import { OnboardingPage, type OnboardingPageProps } from '../components/OnboardingPage';
import { ProgressDots } from '../components/ProgressDots';
import { onboardingStore } from '../store/onboarding.store';

const ONBOARDING_PAGES: OnboardingPageProps[] = [
  {
    icon: Sparkles,
    iconColor: colors.accent.primary,
    title: 'Welcome to Notiver',
    description: 'Your intelligent notification manager',
  },
  {
    icon: Zap,
    iconColor: colors.accent.warning,
    title: 'Smart Automation',
    description: 'Create rules to manage notifications automatically',
  },
  {
    icon: BarChart3,
    iconColor: colors.accent.success,
    title: 'Deep Analytics',
    description: 'Understand your notification patterns',
  },
  {
    icon: Brain,
    iconColor: colors.accent.ai,
    title: 'AI Classification',
    description: 'Notifications sorted by importance automatically',
  },
  {
    icon: Cloud,
    iconColor: colors.text.secondary,
    title: 'Real Data',
    description: 'See live notifications and activity from your device once permissions are granted',
  },
];

export function OnboardingFlow() {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  const isLastPage = activeIndex === ONBOARDING_PAGES.length - 1;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = useCallback(() => {
    if (isLastPage) {
      onboardingStore.markCompleted();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/permissions' as any);
    } else {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    }
  }, [activeIndex, isLastPage, router]);

  const handleSkip = useCallback(() => {
    onboardingStore.markCompleted();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace('/permissions' as any);
  }, [router]);

  return (
    <View className="flex-1 bg-background-primary">
      {/* Pager */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(_, index) => `onboarding-page-${index}`}
        renderItem={({ item }) => (
          <OnboardingPage
            icon={item.icon}
            iconColor={item.iconColor}
            title={item.title}
            description={item.description}
          />
        )}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Bottom Controls */}
      <View className="px-6 pb-12">
        {/* Progress Dots */}
        <View className="mb-8">
          <ProgressDots total={ONBOARDING_PAGES.length} activeIndex={activeIndex} />
        </View>

        {/* Buttons */}
        <View className="flex-row items-center justify-between">
          <Button
            label="Skip"
            variant="ghost"
            size="md"
            onPress={handleSkip}
          />
          <Button
            label={isLastPage ? 'Get Started' : 'Next'}
            variant="primary"
            size="lg"
            onPress={handleNext}
          />
        </View>
      </View>
    </View>
  );
}
