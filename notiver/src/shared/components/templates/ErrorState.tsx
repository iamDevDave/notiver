import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

export interface ErrorStateProps {
  /** Error message to display */
  message: string;
  /** Callback when the retry button is pressed */
  onRetry?: () => void;
  /** Custom retry button label */
  retryLabel?: string;
  /** Additional NativeWind classes */
  className?: string;
}

export function ErrorState({
  message,
  onRetry,
  retryLabel = 'Retry',
  className = '',
}: ErrorStateProps) {
  return (
    <View
      className={`flex-1 items-center justify-center px-xl py-xxxl ${className}`}
      accessibilityRole="alert"
    >
      <View className="bg-accent-danger/10 rounded-full p-lg mb-lg">
        <AlertTriangle size={40} color="#EF4444" />
      </View>

      <Text className="text-text-primary text-md font-semibold text-center mb-sm">
        Something went wrong
      </Text>

      <Text className="text-text-muted text-body text-center max-w-xs">
        {message}
      </Text>

      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          className="mt-xl bg-accent-danger px-6 py-3 rounded-buttons"
        >
          <Text className="text-white font-semibold text-sm">
            {retryLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
