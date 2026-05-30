import { RecentActivityFeed } from '@/src/features/dashboard/components/RecentActivityFeed';
import { useRecentActivity } from '@/src/features/dashboard/hooks';
import {
    isUsingNativeModule,
    notificationListenerBridge,
} from '@/src/native/notification-listener';
import { osInfoModule, type SystemInfo } from '@/src/native/os-info';
import { Button } from '@/src/shared/components/atoms/Button';
import { useRouter } from 'expo-router';
import { RefreshCw, ShieldCheck, Smartphone } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '../../../shared/components/templates/Screen';
import { PermissionCard } from '../components/PermissionCard';
import { usePermissions } from '../hooks/usePermissions';
import { onboardingStore } from '../store/onboarding.store';

/**
 * Permission Center screen displaying all required Android permissions
 * with their current status, explanations, and deep links to settings.
 *
 * BuzzKill-inspired design: dark cards with gold/yellow checkmarks for granted permissions.
 */
export function PermissionCenterScreen() {
  const router = useRouter();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const {
    permissions,
    isRefreshing,
    grantedCount,
    totalCount,
    checkPermissions,
    openSettings,
  } = usePermissions();
  const { data: recentActivity, isLoading: recentActivityLoading } = useRecentActivity(5);

  useEffect(() => {
    let mounted = true;

    const refreshSystemInfo = async () => {
      const info = await osInfoModule.getSystemInfo();
      if (mounted) {
        setSystemInfo(info);
      }
    };

    void refreshSystemInfo();
    const intervalId = setInterval(() => {
      void refreshSystemInfo();
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const liveSystemSummary = useMemo(() => {
    return {
      deviceLabel:
        [systemInfo?.manufacturer, systemInfo?.brand, systemInfo?.model]
          .filter(Boolean)
          .join(' ') || 'Android device',
      osLabel: systemInfo?.osName ?? 'Android',
      osVersion: systemInfo?.osVersion ?? 'unknown',
      apiLevel: systemInfo?.sdkInt ?? null,
      uptime: systemInfo?.uptimeMs ?? null,
      bootTime: systemInfo?.bootTimeMs ?? null,
    };
  }, [systemInfo]);

  const formatDuration = (milliseconds: number | null): string => {
    if (milliseconds === null) return 'Loading...';

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
  };

  const handleContinue = () => {
    onboardingStore.markCompleted();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace('/(tabs)' as any);
  };

  const handleGenerateDemoNotification = () => {
    notificationListenerBridge.emitDemoNotification?.();
  };

  return (
    <Screen scrollable edges={['top', 'bottom']}>
      <View className="px-lg py-xl">
        {/* Header */}
        <View className="items-center mb-xxl">
          <View className="w-16 h-16 rounded-full bg-accent-primary/20 items-center justify-center mb-lg">
            <ShieldCheck size={32} color="#3B82F6" />
          </View>
          <Text className="text-text-primary text-xl font-bold text-center">
            Permission Center
          </Text>
          <Text className="text-text-secondary text-body text-center mt-sm">
            Grant permissions to unlock full functionality
          </Text>
        </View>

        {/* Progress indicator */}
        <View className="bg-surface-card rounded-buttons p-md flex-row items-center justify-between mb-xl">
          <View>
            <Text className="text-text-primary text-body font-semibold">
              {grantedCount} of {totalCount} granted
            </Text>
            <Text className="text-text-muted text-caption mt-xs">
              {grantedCount === totalCount
                ? 'All permissions granted'
                : 'Some features may be limited'}
            </Text>
          </View>
          {/* Refresh button */}
          <Pressable
            onPress={checkPermissions}
            disabled={isRefreshing}
            className={`w-10 h-10 rounded-full bg-surface-elevated items-center justify-center ${
              isRefreshing ? 'opacity-50' : ''
            }`}
            accessibilityRole="button"
            accessibilityLabel="Refresh permission statuses"
          >
            <RefreshCw size={18} color="#A1A1AA" />
          </Pressable>
        </View>

        {/* Live OS data */}
        <View className="bg-surface-card rounded-cards border border-border p-lg mb-md">
          <View className="flex-row items-center mb-md">
            <Smartphone size={18} color="#A1A1AA" />
            <Text className="text-text-primary text-body font-semibold ml-2">
              Live OS Data
            </Text>
          </View>
          <View className="gap-2">
            <Text className="text-text-muted text-caption">
              Device: {liveSystemSummary.deviceLabel}
            </Text>
            <Text className="text-text-muted text-caption">
              OS: {liveSystemSummary.osLabel} {liveSystemSummary.osVersion}
            </Text>
            <Text className="text-text-muted text-caption">
              API level: {liveSystemSummary.apiLevel ?? 'unknown'}
            </Text>
            <Text className="text-text-muted text-caption">
              Uptime: {formatDuration(liveSystemSummary.uptime)}
            </Text>
            <Text className="text-text-muted text-caption">
              Boot time: {formatDuration(liveSystemSummary.bootTime)}
            </Text>
          </View>
        </View>

        {/* Permission cards */}
        {permissions.map((permission) => (
          <PermissionCard
            key={permission.type}
            permission={permission}
            onEnable={openSettings}
          />
        ))}

        {/* Real data preview */}
        <View className="mt-lg">
          <Text className="text-text-primary text-body font-semibold mb-sm">
            Live data preview
          </Text>
          <Text className="text-text-muted text-caption mb-md leading-5">
            This feed updates from the local database in real time.
            {isUsingNativeModule
              ? ' Once notification access is granted, live device notifications will appear here.'
              : ' Expo Go runs in demo mode, so use the button below to generate live sample notifications.'}
          </Text>
          {!isUsingNativeModule && (
            <View className="mb-md">
              <Button
                label="Generate demo notification"
                variant="secondary"
                size="md"
                onPress={handleGenerateDemoNotification}
              />
            </View>
          )}
          <RecentActivityFeed items={recentActivity} isLoading={recentActivityLoading} maxItems={5} />
        </View>

        {/* Footer note */}
        <View className="mt-lg px-md">
          <Text className="text-text-muted text-caption text-center leading-5">
            Permissions can be changed at any time from Android Settings. Tap
            the refresh button above after granting permissions to update
            statuses.
          </Text>
        </View>

        <View className="mt-xl">
          <Button
            label="Continue to app"
            variant="primary"
            size="lg"
            onPress={handleContinue}
          />
        </View>
      </View>
    </Screen>
  );
}
