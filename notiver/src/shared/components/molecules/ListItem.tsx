import React from 'react';
import { View, Text, Pressable, type PressableProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export interface ListItemProps extends Omit<PressableProps, 'children' | 'className'> {
  /** Title text */
  title: string;
  /** Optional subtitle text displayed below the title */
  subtitle?: string;
  /** Icon component rendered on the left */
  leftIcon?: LucideIcon;
  /** Left icon color override */
  leftIconColor?: string;
  /** Custom left element (overrides leftIcon) */
  leftElement?: React.ReactNode;
  /** Trailing element rendered on the right (e.g., chevron, toggle, badge) */
  trailingElement?: React.ReactNode;
  /** Trailing icon component (convenience prop, overridden by trailingElement) */
  trailingIcon?: LucideIcon;
  /** Additional NativeWind classes */
  className?: string;
}

export function ListItem({
  title,
  subtitle,
  leftIcon: LeftIcon,
  leftIconColor = '#A1A1AA',
  leftElement,
  trailingElement,
  trailingIcon: TrailingIcon,
  className = '',
  onPress,
  ...pressableProps
}: ListItemProps) {
  const content = (
    <>
      {leftElement ? (
        <View className="mr-md">{leftElement}</View>
      ) : LeftIcon ? (
        <View className="mr-md bg-surface-elevated rounded-full p-sm">
          <LeftIcon size={20} color={leftIconColor} />
        </View>
      ) : null}

      <View className="flex-1">
        <Text className="text-text-primary text-body" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-text-muted text-caption mt-xs" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailingElement ? (
        <View className="ml-md">{trailingElement}</View>
      ) : TrailingIcon ? (
        <View className="ml-md">
          <TrailingIcon size={20} color="#71717A" />
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={`flex-row items-center px-lg py-md ${className}`}
        style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
        accessibilityRole="button"
        accessibilityLabel={title}
        {...pressableProps}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View className={`flex-row items-center px-lg py-md ${className}`}>
      {content}
    </View>
  );
}
