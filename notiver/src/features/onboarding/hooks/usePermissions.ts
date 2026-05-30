import {
    isUsingNativeModule,
    notificationListenerBridge,
} from '@/src/native/notification-listener';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

export type PermissionType =
  | 'notification_access'
  | 'accessibility_service'
  | 'battery_optimization'
  | 'alarm_permission'
  | 'foreground_service';

export type PermissionStatus = 'granted' | 'not_granted' | 'unknown';

export interface PermissionInfo {
  type: PermissionType;
  name: string;
  description: string;
  explanation: string;
  status: PermissionStatus;
  settingsIntent: string;
}

const PERMISSION_DEFINITIONS: Omit<PermissionInfo, 'status'>[] = [
  {
    type: 'notification_access',
    name: 'Notification Access',
    description: 'Read and manage incoming notifications',
    explanation:
      'Without notification access, the app cannot capture, classify, or automate your notifications. This is the core permission required for all features.',
    settingsIntent: 'android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS',
  },
  {
    type: 'accessibility_service',
    name: 'Accessibility Service',
    description: 'Perform actions on notifications automatically',
    explanation:
      'Without accessibility service, the app cannot dismiss, reply to, or interact with notifications automatically. Rule actions like auto-dismiss and auto-reply will be unavailable.',
    settingsIntent: 'android.settings.ACCESSIBILITY_SETTINGS',
  },
  {
    type: 'battery_optimization',
    name: 'Battery Optimization',
    description: 'Keep the app running in the background',
    explanation:
      'Without battery optimization exemption, Android may kill the app in the background, causing missed notifications and interrupted focus sessions.',
    settingsIntent: 'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  },
  {
    type: 'alarm_permission',
    name: 'Alarm Permission',
    description: 'Schedule exact alarms for rule actions',
    explanation:
      'Without alarm permission, the app cannot schedule exact alarms for delayed notifications or time-based rule triggers.',
    settingsIntent: 'android.settings.REQUEST_SCHEDULE_EXACT_ALARM',
  },
  {
    type: 'foreground_service',
    name: 'Foreground Service',
    description: 'Run persistent background service',
    explanation:
      'Foreground service is declared in the app manifest and is always available. It keeps the notification listener active.',
    settingsIntent: '',
  },
];

/**
 * Hook that manages permission statuses and provides deep linking to settings.
 *
 * For now, uses placeholder status checks since native module bridges
 * are not yet implemented. Foreground service is always granted (manifest-declared).
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionInfo[]>(
    PERMISSION_DEFINITIONS.map((def) => ({
      ...def,
      status: def.type === 'foreground_service' ? 'granted' : 'unknown',
    }))
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkPermissions = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const notificationAccess =
        Platform.OS === 'android' && isUsingNativeModule
          ? ((await notificationListenerBridge.isRunning())
              ? 'granted'
              : 'not_granted')
          : 'not_granted';

      const statuses: Record<PermissionType, PermissionStatus> = {
        notification_access: notificationAccess,
        accessibility_service: 'not_granted', // TODO: NativeModules.AccessibilityBridge.isEnabled()
        battery_optimization: 'not_granted', // TODO: Check via PowerManager.isIgnoringBatteryOptimizations
        alarm_permission: 'not_granted', // TODO: Check via AlarmManager.canScheduleExactAlarms (API 31+)
        foreground_service: 'granted', // Always granted — declared in AndroidManifest.xml
      };

      setPermissions(
        PERMISSION_DEFINITIONS.map((def) => ({
          ...def,
          status: statuses[def.type],
        }))
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  const openSettings = useCallback(async (permissionType: PermissionType) => {
    const permission = PERMISSION_DEFINITIONS.find((p) => p.type === permissionType);
    if (!permission || !permission.settingsIntent) return;

    if (Platform.OS !== 'android') return;

    try {
      // Use Android intent deep linking to open the specific settings screen
      const intentUrl = `intent://#Intent;action=${permission.settingsIntent};end`;
      const canOpen = await Linking.canOpenURL(intentUrl);

      if (canOpen) {
        await Linking.openURL(intentUrl);
      } else {
        // Fallback: open general app settings
        await Linking.openSettings();
      }
    } catch {
      // Final fallback: open general settings
      try {
        await Linking.openSettings();
      } catch {
        // Settings could not be opened — silently fail
      }
    }
  }, []);

  const grantedCount = permissions.filter((p) => p.status === 'granted').length;
  const totalCount = permissions.length;

  return {
    permissions,
    isRefreshing,
    grantedCount,
    totalCount,
    checkPermissions,
    openSettings,
  };
}
