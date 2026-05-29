import React from 'react';
import { View, Text } from 'react-native';
import {
  Zap,
  Bell,
  Clock,
  Activity,
  type LucideIcon,
} from 'lucide-react-native';
import { ListItem } from '@/src/shared/components/molecules';
import { EmptyState } from '@/src/shared/components/templates';
import { Skeleton } from '@/src/shared/components/atoms';
import { colors } from '@/src/theme/tokens';

export type ActivityType = 'rule' | 'notification' | 'focus';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  timestamp: Date;
}

export interface RecentActivityFeedProps {
  /** Activity items ordered by recency */
  items?: ActivityItem[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Maximum number of items to display */
  maxItems?: number;
}

const ACTIVITY_CONFIG: Record<ActivityType, { icon: LucideIcon; color: string }> = {
  rule: { icon: Zap, color: colors.accent.warning },
  notification: { icon: Bell, color: colors.accent.primary },
  focus: { icon: Clock, color: colors.accent.success },
};

/**
 * Formats a timestamp into a relative time string (e.g., "2m ago", "1h ago", "3d ago").
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Recent Activity feed for the dashboard.
 * Shows Rule Activity, Notification Activity, and Focus Sessions ordered by recency.
 *
 * Validates: Requirement 6.4
 */
export function RecentActivityFeed({
  items,
  isLoading,
  maxItems = 10,
}: RecentActivityFeedProps) {
  if (isLoading) {
    return (
      <View className="bg-surface-card rounded-cards border border-border overflow-hidden">
        <View className="px-lg pt-lg pb-sm">
          <Skeleton height={20} width={140} rounded="sm" />
        </View>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} className="px-lg py-md flex-row items-center">
            <Skeleton height={36} width={36} rounded="full" className="mr-md" />
            <View className="flex-1">
              <Skeleton height={14} width="70%" rounded="sm" className="mb-xs" />
              <Skeleton height={12} width="50%" rounded="sm" />
            </View>
          </View>
        ))}
      </View>
    );
  }

  const displayItems = items?.slice(0, maxItems) ?? [];
  const hasData = displayItems.length > 0;

  return (
    <View className="bg-surface-card rounded-cards border border-border overflow-hidden">
      <View className="px-lg pt-lg pb-sm">
        <Text className="text-text-primary text-body font-semibold">
          Recent Activity
        </Text>
        <Text className="text-text-muted text-caption mt-xs">
          Latest events across your automations
        </Text>
      </View>

      {hasData ? (
        <View className="pb-sm">
          {displayItems.map((item) => {
            const config = ACTIVITY_CONFIG[item.type];
            return (
              <ListItem
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                leftIcon={config.icon}
                leftIconColor={config.color}
                trailingElement={
                  <Text className="text-text-muted text-caption">
                    {formatRelativeTime(item.timestamp)}
                  </Text>
                }
              />
            );
          })}
        </View>
      ) : (
        <EmptyState
          icon={Activity}
          title="No recent activity"
          description="Activity from rules, notifications, and focus sessions will appear here."
          className="py-lg"
        />
      )}
    </View>
  );
}
