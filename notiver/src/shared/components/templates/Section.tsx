import React from 'react';
import { View, Text, type ViewProps } from 'react-native';

export interface SectionProps extends Omit<ViewProps, 'className'> {
  /** Section title */
  title: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Additional NativeWind classes */
  className?: string;
  /** Section content */
  children?: React.ReactNode;
}

export function Section({
  title,
  subtitle,
  className = '',
  children,
  ...viewProps
}: SectionProps) {
  return (
    <View className={`mb-xl ${className}`} {...viewProps}>
      <View className="mb-md">
        <Text className="text-text-primary text-md font-semibold">
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-text-muted text-caption mt-xs">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
