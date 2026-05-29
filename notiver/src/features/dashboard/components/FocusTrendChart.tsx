import React from 'react';
import { View } from 'react-native';
import { Brain } from 'lucide-react-native';
import { ChartCard } from '@/src/shared/components/molecules';
import { EmptyState } from '@/src/shared/components/templates';
import { Skeleton } from '@/src/shared/components/atoms';
import { SimpleLineChart, type LineChartDataPoint } from './charts';
import { colors } from '@/src/theme/tokens';

export interface FocusTrendChartProps {
  /** Focus trend data points (label + minutes) */
  data?: LineChartDataPoint[];
  /** Whether data is loading */
  isLoading?: boolean;
}

/**
 * Focus Trend line chart for the dashboard.
 * Shows focus session minutes over the past 7 days.
 *
 * Validates: Requirement 6.3
 */
export function FocusTrendChart({ data, isLoading }: FocusTrendChartProps) {
  if (isLoading) {
    return (
      <View className="mb-md">
        <Skeleton height={200} rounded="lg" className="w-full" />
      </View>
    );
  }

  const hasData = data && data.length > 0 && data.some((d) => d.value > 0);

  return (
    <ChartCard title="Focus Trend" subtitle="Minutes per day" className="mb-md">
      {hasData ? (
        <SimpleLineChart
          data={data!}
          height={160}
          color={colors.accent.success}
          showDots
          showLabels
        />
      ) : (
        <EmptyState
          icon={Brain}
          title="No focus data"
          description="Start a focus session to track your productivity over time."
          className="py-lg"
        />
      )}
    </ChartCard>
  );
}
