import React from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';

export interface ProgressDotsProps {
  /** Total number of pages */
  total: number;
  /** Currently active page index (0-based) */
  activeIndex: number;
}

export function ProgressDots({ total, activeIndex }: ProgressDotsProps) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <MotiView
          key={index}
          animate={{
            width: index === activeIndex ? 24 : 8,
            opacity: index === activeIndex ? 1 : 0.4,
          }}
          transition={{ type: 'timing', duration: 300 }}
          className={`h-2 rounded-full ${
            index === activeIndex ? 'bg-accent-primary' : 'bg-text-muted'
          }`}
        />
      ))}
    </View>
  );
}
