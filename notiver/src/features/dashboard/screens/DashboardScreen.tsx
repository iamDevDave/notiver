import {
    isUsingNativeModule,
    notificationListenerBridge,
} from '@/src/native/notification-listener';
import { Button } from '@/src/shared/components/atoms/Button';
import { Screen, Section } from '@/src/shared/components/templates';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { AnalyticsCards } from '../components/AnalyticsCards';
import { DashboardHeader } from '../components/DashboardHeader';
import { FocusTrendChart } from '../components/FocusTrendChart';
import { NotificationTrendChart } from '../components/NotificationTrendChart';
import { RecentActivityFeed } from '../components/RecentActivityFeed';
import { TopAppsChart } from '../components/TopAppsChart';
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

  const handleGenerateDemoNotification = () => {
    notificationListenerBridge.emitDemoNotification?.();
  };

  return (
    <Screen scrollable edges={['top']}>
      {/* Header with avatar, greeting, search, and notification bell */}
      <DashboardHeader
        userName="User"
        onSearchPress={handleSearchPress}
        onNotificationPress={handleNotificationPress}
      />

      {!isUsingNativeModule ? (
        <View className="px-lg pb-sm">
          <View className="flex-row items-center self-start rounded-full border border-accent-primary/30 bg-accent-primary/10 px-3 py-1.5">
            <View className="mr-2 h-2 w-2 rounded-full bg-accent-primary" />
            <Text className="text-accent-primary text-caption font-semibold">
              Expo Go demo mode
            </Text>
          </View>
        </View>
      ) : null}

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
        {!isUsingNativeModule ? (
          <View className="mb-md rounded-cards border border-border bg-surface-card p-md">
            <Text className="text-text-primary text-body font-semibold">
              Expo Go demo mode
            </Text>
            <Text className="text-text-muted text-caption mt-xs mb-md leading-5">
              Real OS notifications require a dev build. Use this button to
              generate a sample notification and refresh the dashboard feed.
            </Text>
            <Button
              label="Generate demo notification"
              variant="secondary"
              size="md"
              onPress={handleGenerateDemoNotification}
            />
          </View>
        ) : null}

        <RecentActivityFeed
          items={activityItems}
          isLoading={activityLoading}
        />
      </View>
    </Screen>
  );
}
