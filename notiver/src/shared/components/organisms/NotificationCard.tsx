import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Bell, Mail, MailOpen } from 'lucide-react-native';
import { Badge, type BadgeVariant } from '../atoms/Badge';
import type { NotificationCategory } from '@/src/database/schema/notifications';

export interface NotificationCardData {
  id: string;
  appName: string;
  title: string | null;
  content: string | null;
  sender: string | null;
  category: NotificationCategory | null;
  priority: number;
  isRead: boolean;
  receivedAt: Date;
}

export interface NotificationCardProps {
  notification: NotificationCardData;
  onPress?: (id: string) => void;
  className?: string;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getCategoryBadgeVariant(category: NotificationCategory | null): BadgeVariant {
  if (!category) return 'default';
  return category as BadgeVariant;
}

function getPriorityIndicatorColor(priority: number): string {
  if (priority >= 4) return '#EF4444'; // danger
  if (priority >= 3) return '#F59E0B'; // warning
  if (priority >= 2) return '#3B82F6'; // primary
  return '#71717A'; // muted
}

export function NotificationCard({
  notification,
  onPress,
  className = '',
}: NotificationCardProps) {
  const { id, appName, title, content, sender, category, priority, isRead, receivedAt } =
    notification;

  const ReadIcon = isRead ? MailOpen : Mail;

  return (
    <Pressable
      onPress={() => onPress?.(id)}
      className={`bg-surface-card rounded-cards border border-border px-lg py-md mx-lg mb-sm ${!isRead ? 'border-l-2 border-l-accent-primary' : ''} ${className}`}
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
      accessibilityRole="button"
      accessibilityLabel={`Notification from ${appName}: ${title ?? 'No title'}`}
    >
      <View className="flex-row items-start">
        {/* Priority indicator + Icon */}
        <View className="mr-md items-center">
          <View
            className="w-9 h-9 rounded-full bg-surface-elevated items-center justify-center"
          >
            <ReadIcon size={18} color={isRead ? '#71717A' : '#3B82F6'} />
          </View>
          {priority >= 3 && (
            <View
              className="w-2 h-2 rounded-full mt-1"
              style={{ backgroundColor: getPriorityIndicatorColor(priority) }}
            />
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Header row: app name + time */}
          <View className="flex-row items-center justify-between mb-xs">
            <Text
              className={`text-caption font-medium ${isRead ? 'text-text-muted' : 'text-text-secondary'}`}
              numberOfLines={1}
            >
              {appName}
              {sender ? ` · ${sender}` : ''}
            </Text>
            <Text className="text-caption text-text-muted ml-sm">
              {formatRelativeTime(receivedAt)}
            </Text>
          </View>

          {/* Title */}
          {title && (
            <Text
              className={`text-body font-semibold mb-xs ${isRead ? 'text-text-secondary' : 'text-text-primary'}`}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}

          {/* Content preview */}
          {content && (
            <Text
              className="text-caption text-text-muted"
              numberOfLines={2}
            >
              {content}
            </Text>
          )}

          {/* Category badge */}
          {category && (
            <View className="mt-sm">
              <Badge
                label={category.charAt(0).toUpperCase() + category.slice(1)}
                variant={getCategoryBadgeVariant(category)}
              />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
