import React from 'react';
import { View } from 'react-native';
import { Smartphone } from 'lucide-react-native';
import { ChartCard } from '@/src/shared/components/molecules';
import { EmptyState } from '@/src/shared/components/templates';
import { Skeleton } from '@/src/shared/components/atoms';
import { SimpleBarChart, type BarChartDataPoint } from './charts';
import { colors } from '@/src/theme/tokens';

export interface TopAppsChartProps {
  /** Top apps data (app name + notification count) */
  data?: BarChartDataPoint[];
  /** Whether data is loading */
  isLoading?: boolean;
}

/** Color palette for bar chart items */
const BAR_COLORS = [
  colors.accent.primary,
  colors.accent.success,
  colors.accent.warning,
  colors.accent.ai,
  colors.accent.danger,
];

/**
 * Top Apps bar chart for the dashboard.
 * Shows the top 5 apps by notification count.
 *
 * Validates: Requirement 6.3
 */
export function TopAppsChart({ data, isLoading }: TopAppsChartProps) {
  if (isLoading) {
    return (
      <View className="mb-md">
        <Skeleton height={200} rounded="lg" className="w-full" />
      </View>
    );
  }

  const hasData = data && data.length > 0 && data.some((d) => d.value > 0);

  // Assign colors to bars
  const coloredData = data?.map((d, i) => ({
    ...d,
    color: d.color ?? BAR_COLORS[i % BAR_COLORS.length],
  }));

  return (
    <ChartCard title="Top Apps" subtitle="By notification count" className="mb-md">
      {hasData ? (
        <SimpleBarChart data={coloredData!} height={160} showValues showLabels />
      ) : (
        <EmptyState
          icon={Smartphone}
          title="No app data"
          description="App notification stats will appear once notifications are received."
          className="py-lg"
        />
      )}
    </ChartCard>
  );
}
