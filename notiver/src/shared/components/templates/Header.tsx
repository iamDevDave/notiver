import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

export interface HeaderAction {
  /** Icon component from lucide-react-native */
  icon: LucideIcon;
  /** Callback when the action is pressed */
  onPress: () => void;
  /** Accessibility label for the action */
  accessibilityLabel: string;
}

export interface HeaderProps {
  /** Header title text */
  title: string;
  /** Show back arrow button */
  showBack?: boolean;
  /** Callback when back button is pressed */
  onBack?: () => void;
  /** Right-side action buttons */
  actions?: HeaderAction[];
  /** Additional NativeWind classes */
  className?: string;
}

export function Header({
  title,
  showBack = false,
  onBack,
  actions = [],
  className = '',
}: HeaderProps) {
  return (
    <View
      className={`flex-row items-center px-lg py-md bg-background-primary ${className}`}
      accessibilityRole="header"
    >
      {showBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="p-sm mr-sm rounded-full"
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
      ) : null}

      <Text
        className="flex-1 text-text-primary text-lg font-bold"
        numberOfLines={1}
      >
        {title}
      </Text>

      {actions.length > 0 ? (
        <View className="flex-row items-center gap-sm">
          {actions.map((action, index) => (
            <Pressable
              key={index}
              onPress={action.onPress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
              className="p-sm rounded-full"
            >
              <action.icon size={22} color="#A1A1AA" />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
