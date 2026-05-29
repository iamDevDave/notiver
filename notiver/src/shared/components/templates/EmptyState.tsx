import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export interface EmptyStateProps {
  /** Icon component from lucide-react-native */
  icon: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Callback when the action button is pressed */
  onAction?: () => void;
  /** Additional NativeWind classes */
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <View
      className={`flex-1 items-center justify-center px-xl py-xxxl ${className}`}
      accessibilityRole="text"
    >
      <View className="bg-surface-elevated rounded-full p-lg mb-lg">
        <Icon size={40} color="#71717A" />
      </View>

      <Text className="text-text-primary text-md font-semibold text-center mb-sm">
        {title}
      </Text>

      <Text className="text-text-muted text-body text-center max-w-xs">
        {description}
      </Text>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          className="mt-xl bg-accent-primary px-6 py-3 rounded-buttons"
        >
          <Text className="text-white font-semibold text-sm">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
