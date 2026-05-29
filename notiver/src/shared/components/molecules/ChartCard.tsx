import React from 'react';
import { View, Text } from 'react-native';

export interface ChartCardProps {
  /** Title displayed in the card header */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Chart content rendered inside the card body */
  children?: React.ReactNode;
  /** Additional NativeWind classes */
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: ChartCardProps) {
  return (
    <View
      className={`bg-surface-card rounded-cards border border-border overflow-hidden ${className}`}
      accessibilityRole="summary"
      accessibilityLabel={`${title} chart`}
    >
      <View className="px-lg pt-lg pb-sm">
        <Text className="text-text-primary text-body font-semibold">
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-text-muted text-caption mt-xs">
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View className="px-lg pb-lg">{children}</View>
    </View>
  );
}
