import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Search, Bell } from 'lucide-react-native';
import { Avatar } from '@/src/shared/components/atoms';

export interface DashboardHeaderProps {
  /** User display name for greeting and avatar */
  userName?: string;
  /** Callback when search button is pressed */
  onSearchPress?: () => void;
  /** Callback when notification bell is pressed */
  onNotificationPress?: () => void;
  /** Number of unread notifications to show as badge */
  unreadCount?: number;
}

/**
 * Returns a time-based greeting string.
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Dashboard header with user avatar, time-based greeting,
 * search button, and notification bell icon.
 */
export function DashboardHeader({
  userName = 'User',
  onSearchPress,
  onNotificationPress,
  unreadCount = 0,
}: DashboardHeaderProps) {
  const greeting = getGreeting();

  return (
    <View
      className="flex-row items-center px-lg py-md"
      accessibilityRole="header"
    >
      {/* User avatar */}
      <Avatar name={userName} size="md" />

      {/* Greeting text */}
      <View className="flex-1 ml-md">
        <Text className="text-text-secondary text-caption font-medium">
          {greeting}
        </Text>
        <Text className="text-text-primary text-body font-bold">
          {userName}
        </Text>
      </View>

      {/* Action buttons */}
      <View className="flex-row items-center gap-sm">
        {/* Search button */}
        <Pressable
          onPress={onSearchPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Search notifications"
          className="p-sm rounded-full bg-surface-elevated"
        >
          <Search size={20} color="#A1A1AA" />
        </Pressable>

        {/* Notification bell */}
        <Pressable
          onPress={onNotificationPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          className="p-sm rounded-full bg-surface-elevated relative"
        >
          <Bell size={20} color="#A1A1AA" />
          {unreadCount > 0 && (
            <View className="absolute -top-0.5 -right-0.5 bg-accent-danger rounded-full w-4 h-4 items-center justify-center">
              <Text className="text-white text-[10px] font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}
