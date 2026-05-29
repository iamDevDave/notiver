import React from 'react';
import { View, Text, Pressable, type ViewProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export interface CardHeaderProps {
  /** Card title */
  title: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Optional action icon rendered on the right side of the header */
  actionIcon?: LucideIcon;
  /** Callback when the action icon is pressed */
  onActionPress?: () => void;
}

export interface CardProps extends Omit<ViewProps, 'className'> {
  /** Optional header configuration */
  header?: CardHeaderProps;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Additional NativeWind classes for the outer container */
  className?: string;
  /** Card content */
  children?: React.ReactNode;
}

export function Card({
  header,
  footer,
  className = '',
  children,
  ...viewProps
}: CardProps) {
  return (
    <View
      className={`bg-surface-card rounded-cards border border-border overflow-hidden ${className}`}
      accessibilityRole="summary"
      {...viewProps}
    >
      {header ? (
        <View className="flex-row items-center justify-between px-lg pt-lg pb-sm">
          <View className="flex-1">
            <Text className="text-text-primary text-body font-semibold">
              {header.title}
            </Text>
            {header.subtitle ? (
              <Text className="text-text-muted text-caption mt-xs">
                {header.subtitle}
              </Text>
            ) : null}
          </View>
          {header.actionIcon ? (
            <Pressable
              onPress={header.onActionPress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${header.title} action`}
              className="p-sm rounded-full"
            >
              <header.actionIcon size={20} color="#A1A1AA" />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View className="px-lg py-sm">{children}</View>

      {footer ? (
        <View className="px-lg pb-lg pt-sm border-t border-border-subtle">
          {footer}
        </View>
      ) : null}
    </View>
  );
}
