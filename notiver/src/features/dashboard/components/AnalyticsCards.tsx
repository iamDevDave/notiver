import React from 'react';
import { View } from 'react-native';
import {
  Bell,
  Zap,
  Clock,
  TrendingUp,
  Brain,
} from 'lucide-react-native';
import { StatCard } from '@/src/shared/components/molecules';
import { Skeleton } from '@/src/shared/components/atoms';
import type { DashboardAnalytics } from '../hooks/use-dashboard-analytics';

export interface AnalyticsCardsProps {
  /** Analytics data to display */
  data?: DashboardAnalytics;
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Formats minutes into a human-readable string (e.g., "2h 30m" or "45m").
 */
function formatFocusTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Dashboard analytics stat cards grid.
 * Displays: Notifications Today, Rules Triggered, Focus Time, Productivity Score, Focus Score.
 */
export function AnalyticsCards({ data, isLoading }: AnalyticsCardsProps) {
  if (isLoading) {
    return (
      <View>
        <View className="flex-row flex-wrap gap-md">
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} className="w-[47%]">
              <Skeleton height={110} rounded="lg" className="w-full" />
            </View>
          ))}
        </View>
      </View>
    );
  }

  const analytics = data ?? {
    notificationsToday: 0,
    rulesTriggered: 0,
    focusMinutes: 0,
    productivityScore: 0,
    focusScore: 0,
  };

  return (
    <View>
      <View className="flex-row flex-wrap gap-md">
        <View className="w-[47%]">
          <StatCard
            label="Notifications Today"
            value={analytics.notificationsToday}
            icon={Bell}
            iconColor="#3B82F6"
          />
        </View>

        <View className="w-[47%]">
          <StatCard
            label="Rules Triggered"
            value={analytics.rulesTriggered}
            icon={Zap}
            iconColor="#F59E0B"
          />
        </View>

        <View className="w-[47%]">
          <StatCard
            label="Focus Time"
            value={formatFocusTime(analytics.focusMinutes)}
            icon={Clock}
            iconColor="#10B981"
          />
        </View>

        <View className="w-[47%]">
          <StatCard
            label="Productivity Score"
            value={`${analytics.productivityScore}%`}
            icon={TrendingUp}
            iconColor="#8B5CF6"
          />
        </View>

        <View className="w-[47%]">
          <StatCard
            label="Focus Score"
            value={`${analytics.focusScore}%`}
            icon={Brain}
            iconColor="#10B981"
          />
        </View>
      </View>
    </View>
  );
}
