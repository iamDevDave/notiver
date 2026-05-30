import { ListItem } from '@/src/shared/components/molecules/ListItem';
import { colors } from '@/src/theme/tokens';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

export interface SettingValueProps {
  /** Title text */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Left icon */
  icon?: LucideIcon;
  /** Icon color override */
  iconColor?: string;
  /** Current value to display */
  value?: string;
  /** Called when the item is pressed */
  onPress?: () => void;
  /** Whether to show a chevron indicating navigation */
  showChevron?: boolean;
}

/**
 * A settings list item that displays a current value on the right.
 * Optionally shows a chevron for navigation.
 */
export function SettingValue({
  title,
  subtitle,
  icon,
  iconColor,
  value,
  onPress,
  showChevron = false,
}: SettingValueProps) {
  return (
    <ListItem
      title={title}
      subtitle={subtitle}
      leftIcon={icon}
      leftIconColor={iconColor}
      onPress={onPress}
      trailingElement={
        <View className="flex-row items-center">
          {value ? (
            <Text className="text-text-muted text-caption mr-sm">
              {value}
            </Text>
          ) : null}
          {showChevron && onPress ? (
            <ChevronRight size={18} color={colors.text.muted} />
          ) : null}
        </View>
      }
    />
  );
}
