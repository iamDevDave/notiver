import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { BarChart3, PieChart, TrendingUp, Grid3X3 } from 'lucide-react-native';
import { Screen, Section } from '@/src/shared/components/templates';
import { ChartCard } from '@/src/shared/components/molecules';
import { EmptyState } from '@/src/shared/components/templates';
import { Skeleton } from '@/src/shared/components/atoms';
import { SimpleBarChart } from '@/src/features/dashboard/components/charts';
import { SimpleLineChart } from '@/src/features/dashboard/components/charts';
import { SimplePieChart } from '../components/SimplePieChart';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import {
  useAnalyticsMetrics,
  useNotificationTrend,
  useTopApps,
  useActivityHeatmap,
} from '../hooks/use-analytics';
import type { TimePeriod } from '@/src/services/analytics';
import { colors } from '@/src/theme/tokens';

/** Available time period tabs */
const TIME_PERIODS: { key: TimePeriod; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

/** Category colors for the pie chart */
const CATEGORY_COLORS: Record<string, string> = {
  important: colors.accent.primary,
  work: '#6366F1',
  social: '#EC4899',
  spam: colors.text.muted,
  promotion: colors.accent.warning,
  emergency: colors.accent.danger,
};

/**
 * Analytics Home Screen.
 * Displays comprehensive analytics with time period tabs and multiple chart types:
 * - Bar chart for notification volume
 * - Pie chart for category distribution
 * - Line chart for trends over time
 * - Heatmap for activity patterns (hour × day)
 *
 * All charts are wired to AnalyticsService via TanStack Query.
 *
 * Validates: Requirements 12.2, 12.3
 */
export function AnalyticsHomeScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('weekly');

  const { data: metrics, isLoading: metricsLoading } = useAnalyticsMetrics(selectedPeriod);
  const { data: trendData, isLoading: trendLoading } = useNotificationTrend(selectedPeriod);
  const { data: topApps, isLoading: appsLoading } = useTopApps(selectedPeriod, 6);
  const { data: heatmapData, isLoading: heatmapLoading } = useActivityHeatmap(selectedPeriod);

  return (
    <Screen scrollable edges={['top']}>
      {/* Header */}
      <View className="px-lg pt-lg pb-sm">
        <Text className="text-text-primary text-xl font-bold">Analytics</Text>
        <Text className="text-text-muted text-caption mt-xs">
          Insights into your notification patterns
        </Text>
      </View>

      {/* Time Period Tabs */}
      <TimePeriodTabs
        selected={selectedPeriod}
        onSelect={setSelectedPeriod}
      />

      {/* Summary Stats */}
      <View className="px-lg mt-md">
        <SummaryStats metrics={metrics} isLoading={metricsLoading} />
      </View>

      {/* Bar Chart - Notification Volume */}
      <View className="px-lg mt-md">
        <ChartCard title="Notification Volume" subtitle={`${capitalize(selectedPeriod)} breakdown`}>
          {trendLoading ? (
            <Skeleton height={170} rounded="md" className="w-full" />
          ) : trendData && trendData.length > 0 && trendData.some((d) => d.value > 0) ? (
            <SimpleBarChart
              data={trendData.map((d) => ({ label: d.label, value: d.value }))}
              height={170}
              color={colors.accent.primary}
              showValues
              showLabels
            />
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No volume data"
              description="Notification volume will appear as data is collected."
              className="py-lg"
            />
          )}
        </ChartCard>
      </View>

      {/* Pie Chart - Category Distribution */}
      <View className="px-lg mt-md">
        <ChartCard title="Category Distribution" subtitle="Notifications by category">
          {metricsLoading ? (
            <Skeleton height={220} rounded="md" className="w-full" />
          ) : metrics && Object.keys(metrics.categoryBreakdown).length > 0 ? (
            <SimplePieChart
              data={Object.entries(metrics.categoryBreakdown)
                .filter(([, count]) => count > 0)
                .map(([category, count]) => ({
                  label: capitalize(category),
                  value: count,
                  color: CATEGORY_COLORS[category] ?? colors.text.muted,
                }))}
              size={180}
              showLegend
            />
          ) : (
            <EmptyState
              icon={PieChart}
              title="No category data"
              description="Category distribution will appear once notifications are classified."
              className="py-lg"
            />
          )}
        </ChartCard>
      </View>

      {/* Line Chart - Trends Over Time */}
      <View className="px-lg mt-md">
        <ChartCard title="Notification Trend" subtitle={`${capitalize(selectedPeriod)} trend`}>
          {trendLoading ? (
            <Skeleton height={170} rounded="md" className="w-full" />
          ) : trendData && trendData.length > 0 && trendData.some((d) => d.value > 0) ? (
            <SimpleLineChart
              data={trendData.map((d) => ({ label: d.label, value: d.value }))}
              height={170}
              color={colors.accent.success}
              showDots
              showLabels
            />
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No trend data"
              description="Trends will appear as notifications are received over time."
              className="py-lg"
            />
          )}
        </ChartCard>
      </View>

      {/* Heatmap - Activity Patterns */}
      <View className="px-lg mt-md mb-xl">
        <ChartCard title="Activity Patterns" subtitle="Hour × Day heatmap">
          {heatmapLoading ? (
            <Skeleton height={230} rounded="md" className="w-full" />
          ) : heatmapData && heatmapData.length > 0 ? (
            <ActivityHeatmap data={heatmapData} height={200} />
          ) : (
            <EmptyState
              icon={Grid3X3}
              title="No activity data"
              description="Activity patterns will appear as you use the app."
              className="py-lg"
            />
          )}
        </ChartCard>
      </View>
    </Screen>
  );
}

// --- Sub-components ---

interface TimePeriodTabsProps {
  selected: TimePeriod;
  onSelect: (period: TimePeriod) => void;
}

/**
 * Horizontal tab bar for selecting the analytics time period.
 */
function TimePeriodTabs({ selected, onSelect }: TimePeriodTabsProps) {
  return (
    <View className="flex-row mx-lg mt-sm bg-surface-card rounded-buttons p-1">
      {TIME_PERIODS.map(({ key, label }) => {
        const isActive = selected === key;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            className={`flex-1 py-2.5 rounded-[12px] items-center ${
              isActive ? 'bg-accent-primary' : ''
            }`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${label} time period`}
          >
            <Text
              className={`text-caption font-semibold ${
                isActive ? 'text-white' : 'text-text-muted'
              }`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface SummaryStatsProps {
  metrics?: {
    notificationCount: number;
    ruleTriggeredCount: number;
    productivityScore: number;
    focusScore: number;
  };
  isLoading: boolean;
}

/**
 * Summary stat cards showing key metrics for the selected period.
 */
function SummaryStats({ metrics, isLoading }: SummaryStatsProps) {
  if (isLoading) {
    return (
      <View className="flex-row flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} className="flex-1 min-w-[45%]">
            <Skeleton height={72} rounded="lg" className="w-full" />
          </View>
        ))}
      </View>
    );
  }

  const stats = [
    { label: 'Notifications', value: metrics?.notificationCount ?? 0, color: colors.accent.primary },
    { label: 'Rules Triggered', value: metrics?.ruleTriggeredCount ?? 0, color: colors.accent.success },
    { label: 'Productivity', value: `${metrics?.productivityScore ?? 0}%`, color: colors.accent.warning },
    { label: 'Focus Score', value: `${metrics?.focusScore ?? 0}%`, color: colors.accent.ai },
  ];

  return (
    <View className="flex-row flex-wrap gap-2">
      {stats.map((stat) => (
        <View
          key={stat.label}
          className="flex-1 min-w-[45%] bg-surface-card rounded-cards p-3 border border-border"
        >
          <Text className="text-text-muted text-caption">{stat.label}</Text>
          <Text className="text-text-primary text-lg font-bold mt-1" style={{ color: stat.color }}>
            {stat.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

// --- Utilities ---

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
