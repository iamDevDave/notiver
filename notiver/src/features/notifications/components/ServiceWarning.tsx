/**
 * ServiceWarning component.
 * Displays a warning banner when the NotificationListenerService is not running,
 * with a button to open Android notification access settings.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking, Platform } from 'react-native';
import { AlertTriangle, Settings, X } from 'lucide-react-native';

import {
  notificationListenerBridge,
  isUsingNativeModule,
} from '../../../native/notification-listener';

/** Interval (ms) to poll the service status */
const STATUS_POLL_INTERVAL = 5_000;

export interface ServiceWarningProps {
  /** Additional NativeWind classes for the container */
  className?: string;
  /** Whether the warning can be dismissed temporarily */
  dismissible?: boolean;
}

/**
 * Warning banner shown when the NotificationListenerService is not running.
 * Polls the service status periodically and shows/hides accordingly.
 * Provides a button to open Android notification access settings.
 */
export function ServiceWarning({
  className = '',
  dismissible = true,
}: ServiceWarningProps) {
  const [isRunning, setIsRunning] = useState<boolean | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkStatus() {
      try {
        const running = await notificationListenerBridge.isRunning();
        if (mounted) {
          setIsRunning(running);
          // Reset dismissed state if service comes back
          if (running) {
            setIsDismissed(false);
          }
        }
      } catch {
        if (mounted) {
          setIsRunning(false);
        }
      }
    }

    // Initial check
    checkStatus();

    // Poll periodically
    const interval = setInterval(checkStatus, STATUS_POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Don't render while loading initial status
  if (isRunning === null) return null;

  // Don't render if service is running
  if (isRunning) return null;

  // Don't render if user dismissed
  if (isDismissed) return null;

  const handleOpenSettings = () => {
    if (Platform.OS === 'android') {
      Linking.openSettings();
    }
  };

  const handleRestart = async () => {
    try {
      await notificationListenerBridge.requestRestart();
    } catch {
      // If restart fails, prompt user to open settings
      handleOpenSettings();
    }
  };

  return (
    <View
      className={`mx-4 mt-2 rounded-cards bg-accent-warning/10 border border-accent-warning/30 p-3 ${className}`}
      accessibilityRole="alert"
      accessibilityLabel="Notification service is not running"
    >
      <View className="flex-row items-start">
        <AlertTriangle size={20} color="#F59E0B" className="mt-0.5" />

        <View className="ml-3 flex-1">
          <Text className="text-sm font-semibold text-accent-warning">
            Notification Service Inactive
          </Text>
          <Text className="text-xs text-text-secondary mt-1">
            {isUsingNativeModule
              ? 'The notification listener service has stopped. Notifications will not be captured until it is restarted.'
              : 'Running in development mode. Native notification listener is not available.'}
          </Text>

          <View className="flex-row mt-2 gap-2">
            {isUsingNativeModule && (
              <Pressable
                onPress={handleRestart}
                className="flex-row items-center bg-accent-warning/20 rounded-buttons px-3 py-1.5"
                accessibilityRole="button"
                accessibilityLabel="Restart notification service"
              >
                <Text className="text-xs font-medium text-accent-warning">
                  Restart
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleOpenSettings}
              className="flex-row items-center bg-surface-elevated rounded-buttons px-3 py-1.5"
              accessibilityRole="button"
              accessibilityLabel="Open notification access settings"
            >
              <Settings size={12} color="#A1A1AA" />
              <Text className="text-xs font-medium text-text-secondary ml-1">
                Settings
              </Text>
            </Pressable>
          </View>
        </View>

        {dismissible && (
          <Pressable
            onPress={() => setIsDismissed(true)}
            className="p-1"
            accessibilityRole="button"
            accessibilityLabel="Dismiss warning"
          >
            <X size={16} color="#71717A" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
