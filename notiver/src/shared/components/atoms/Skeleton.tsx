import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

export interface SkeletonProps {
  /** Width of the skeleton (NativeWind class or style) */
  width?: number | string;
  /** Height of the skeleton (NativeWind class or style) */
  height?: number | string;
  /** Border radius variant */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  /** Additional NativeWind classes */
  className?: string;
}

const roundedStyles: Record<string, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Skeleton({
  width,
  height,
  rounded = 'md',
  className = '',
}: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 1], [0.3, 0.7]);
    return { opacity };
  });

  return (
    <Animated.View
      style={[
        animatedStyle,
        width !== undefined ? { width: typeof width === 'number' ? width : undefined } : undefined,
        height !== undefined ? { height: typeof height === 'number' ? height : undefined } : undefined,
      ]}
      className={`bg-surface-elevated ${roundedStyles[rounded]} ${className}`}
      accessibilityRole="none"
      accessibilityLabel="Loading"
    >
      {/* Spacer to maintain dimensions when using className for sizing */}
      <View style={{ width: typeof width === 'string' ? undefined : width, height: typeof height === 'string' ? undefined : height }} />
    </Animated.View>
  );
}
