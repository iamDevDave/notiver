import React, { useState } from 'react';
import { View, Text, Image, type ImageSourcePropType } from 'react-native';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  /** Image source (URI or require) */
  source?: ImageSourcePropType | null;
  /** Name used to generate fallback initials (first letter of first two words) */
  name?: string;
  /** Size preset */
  size?: AvatarSize;
  /** Additional NativeWind classes */
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; dimension: number }> = {
  sm: { container: 'w-8 h-8', text: 'text-xs', dimension: 32 },
  md: { container: 'w-10 h-10', text: 'text-sm', dimension: 40 },
  lg: { container: 'w-14 h-14', text: 'text-lg', dimension: 56 },
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

export function Avatar({
  source,
  name,
  size = 'md',
  className = '',
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const styles = sizeStyles[size];
  const showImage = source && !imageError;

  return (
    <View
      className={`${styles.container} rounded-full bg-surface-elevated items-center justify-center overflow-hidden ${className}`}
      accessibilityRole="image"
      accessibilityLabel={name ? `Avatar for ${name}` : 'Avatar'}
    >
      {showImage ? (
        <Image
          source={source}
          style={{ width: styles.dimension, height: styles.dimension }}
          onError={() => setImageError(true)}
          resizeMode="cover"
        />
      ) : (
        <Text className={`${styles.text} font-semibold text-text-secondary`}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}
