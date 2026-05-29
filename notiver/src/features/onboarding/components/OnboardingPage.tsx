import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { MotiView } from 'moti';
import type { LucideIcon } from 'lucide-react-native';

export interface OnboardingPageProps {
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Icon color (accent color) */
  iconColor: string;
  /** Page title */
  title: string;
  /** Page description */
  description: string;
}

export function OnboardingPage({
  icon: Icon,
  iconColor,
  title,
  description,
}: OnboardingPageProps) {
  const { width } = useWindowDimensions();

  return (
    <View style={{ width }} className="flex-1 items-center justify-center px-8">
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 500 }}
        className="mb-8 items-center justify-center rounded-full bg-surface-elevated p-6"
      >
        <Icon size={64} color={iconColor} />
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 200 }}
      >
        <Text className="text-center text-2xl font-bold text-text-primary">
          {title}
        </Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 400 }}
      >
        <Text className="mt-4 text-center text-base text-text-secondary">
          {description}
        </Text>
      </MotiView>
    </View>
  );
}
