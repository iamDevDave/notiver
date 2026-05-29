import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Section } from '@/src/shared/components/templates';
import { DashboardHeader } from '../components/DashboardHeader';
import { AnalyticsCards } from '../components/AnalyticsCards';
import { NotificationTrendChart } from '../components/NotificationTrendChart';
import { TopAppsChart } from '../components/TopAppsChart';
import { FocusTrendChart } from '../components/FocusTrendChart';
import { RecentActivityFeed } from '../components/RecentActivityFeed';
import { useDashboardAnalytics } from '../hooks/use-dashboard-analytics';
import { useDashboardCharts } from '../hooks/use-dashboard-charts';
import { useRecentActivity } from '../hooks/use-recent-activity';

/**
 * Main Dashboard screen.
 * Displays a header with user avatar, time-based greeting, search and notification bell,
 * followed by analytics stat cards, charts, and a recent activity feed.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function DashboardScreen() {
  const router = useRouter();
  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics();
  const { data: chartData, isLoading: chartsLoading } = useDashboardCharts();
  const { data: activityItems, isLoading: activityLoading } = useRecentActivity();

  const handleSearchPress = () => {
    // Navigate to search screen (will be implemented in future task)
  };

  const handleNotificationPress = () => {
    // Navigate to notifications tab
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push('/(tabs)/notifications' as any);
  };

  return (
    <Screen scrollable edges={['top']}>
      {/* Header with avatar, greeting, search, and notification bell */}
      <DashboardHeader
        userName="User"
        onSearchPress={handleSearchPress}
        onNotificationPress={handleNotificationPress}
      />

      {/* Analytics stat cards section */}
      <View className="mt-md">
        <Section title="Today's Overview" className="px-lg">
          <AnalyticsCards data={analytics} isLoading={analyticsLoading} />
        </Section>
      </View>

      {/* Charts section */}
      <View className="mt-sm px-lg">
        <NotificationTrendChart
          data={chartData?.notificationTrend}
          isLoading={chartsLoading}
        />

        <TopAppsChart
          data={chartData?.topApps}
          isLoading={chartsLoading}
        />

        <FocusTrendChart
          data={chartData?.focusTrend}
          isLoading={chartsLoading}
        />
      </View>

      {/* Recent Activity feed */}
      <View className="mt-sm px-lg mb-xl">
        <RecentActivityFeed
          items={activityItems}
          isLoading={activityLoading}
        />
      </View>
    </Screen>
  );
}
