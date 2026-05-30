import { ListItem } from '@/src/shared/components/molecules/ListItem';
import { colors } from '@/src/theme/tokens';
import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Switch } from 'react-native';

export interface SettingToggleProps {
  /** Title text */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Left icon */
  icon?: LucideIcon;
  /** Icon color override */
  iconColor?: string;
  /** Current toggle value */
  value: boolean;
  /** Called when toggle changes */
  onValueChange: (value: boolean) => void;
  /** Whether the toggle is disabled */
  disabled?: boolean;
}

/**
 * A settings list item with a toggle switch on the right.
 */
export function SettingToggle({
  title,
  subtitle,
  icon,
  iconColor,
  value,
  onValueChange,
  disabled = false,
}: SettingToggleProps) {
  return (
    <ListItem
      title={title}
      subtitle={subtitle}
      leftIcon={icon}
      leftIconColor={iconColor}
      onPress={disabled ? undefined : () => onValueChange(!value)}
      trailingElement={
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{
            false: colors.surface.elevated,
            true: colors.accent.primary,
          }}
          thumbColor={colors.text.primary}
          accessibilityLabel={`${title} toggle`}
          accessibilityState={{ checked: value, disabled }}
        />
      }
    />
  );
}
