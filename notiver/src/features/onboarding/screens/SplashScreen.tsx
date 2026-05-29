import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { MotiView } from 'moti';

export interface SplashScreenProps {
  /** Status text displayed below the loading indicator */
  statusText?: string;
}

export function SplashScreen({ statusText = 'Initializing...' }: SplashScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-background-primary">
      {/* Logo / App Name */}
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 600 }}
        className="items-center"
      >
        <View className="mb-4 h-24 w-24 items-center justify-center rounded-3xl bg-accent-primary">
          <Text className="text-4xl font-bold text-white">N</Text>
        </View>
        <Text className="text-3xl font-bold text-text-primary">Notiver</Text>
      </MotiView>

      {/* Loading Animation */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 400, delay: 400 }}
        className="mt-12 items-center"
      >
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-sm text-text-muted">{statusText}</Text>
      </MotiView>

      {/* Version Number */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 400, delay: 600 }}
        className="absolute bottom-12"
      >
        <Text className="text-xs text-text-muted">v1.0.0</Text>
      </MotiView>
    </View>
  );
}
