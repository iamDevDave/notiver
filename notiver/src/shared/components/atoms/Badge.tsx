import React from 'react';
import { View, Text } from 'react-native';

export type BadgeVariant =
  | 'important'
  | 'work'
  | 'social'
  | 'spam'
  | 'promotion'
  | 'emergency'
  | 'default';

export interface BadgeProps {
  /** Text label displayed inside the badge */
  label: string;
  /** Color variant matching notification categories */
  variant?: BadgeVariant;
  /** Additional NativeWind classes */
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  important: { bg: 'bg-accent-primary/20', text: 'text-accent-primary' },
  work: { bg: 'bg-accent-ai/20', text: 'text-accent-ai' },
  social: { bg: 'bg-accent-success/20', text: 'text-accent-success' },
  spam: { bg: 'bg-surface-elevated', text: 'text-text-muted' },
  promotion: { bg: 'bg-accent-warning/20', text: 'text-accent-warning' },
  emergency: { bg: 'bg-accent-danger/20', text: 'text-accent-danger' },
  default: { bg: 'bg-surface-elevated', text: 'text-text-secondary' },
};

export function Badge({
  label,
  variant = 'default',
  className = '',
}: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <View
      className={`self-start px-2.5 py-1 rounded-full ${styles.bg} ${className}`}
      accessibilityRole="text"
      accessibilityLabel={`${variant} badge: ${label}`}
    >
      <Text className={`text-xs font-medium ${styles.text}`}>{label}</Text>
    </View>
  );
}
