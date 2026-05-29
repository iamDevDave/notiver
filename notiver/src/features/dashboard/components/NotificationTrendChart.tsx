import React from 'react';
import { View } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { ChartCard } from '@/src/shared/components/molecules';
import { EmptyState } from '@/src/shared/components/templates';
import { Skeleton } from '@/src/shared/components/atoms';
import { SimpleLineChart, type LineChartDataPoint } from './charts';

export interface NotificationTrendChartProps {
  /** Trend data points (label + count) */
  data?: LineChartDataPoint[];
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Notification Trend line chart for the dashboard.
 * Shows notification volume over the past 7 days.
 *
 * Validates: Requirement 6.3
 */
export function NotificationTrendChart({ data, isLoading }: NotificationTrendChartProps) {
  if (isLoading) {
    return (
      <View className="mb-md">
        <Skeleton height={200} rounded="lg" className="w-full" />
      </View>
    );
  }

  const hasData = data && data.length > 0 && data.some((d) => d.value > 0);

  return (
    <ChartCard title="Notification Trend" subtitle="Last 7 days" className="mb-md">
      {hasData ? (
        <SimpleLineChart data={data!} height={160} showDots showLabels />
      ) : (
        <EmptyState
          icon={TrendingUp}
          title="No notification data"
          description="Notifications will appear here as they are received."
          className="py-lg"
        />
      )}
    </ChartCard>
  );
}
