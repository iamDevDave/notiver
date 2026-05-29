import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export interface LoadingStateProps {
  /** Optional message displayed below the spinner */
  message?: string;
  /** Size of the activity indicator */
  size?: 'small' | 'large';
  /** Additional NativeWind classes */
  className?: string;
}

export function LoadingState({
  message,
  size = 'large',
  className = '',
}: LoadingStateProps) {
  return (
    <View
      className={`flex-1 items-center justify-center px-xl py-xxxl ${className}`}
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? 'Loading'}
    >
      <ActivityIndicator size={size} color="#3B82F6" />

      {message ? (
        <Text className="text-text-muted text-body text-center mt-lg">
          {message}
        </Text>
      ) : null}
    </View>
  );
}
