/**
 * Notification Listener Bridge - Main export.
 *
 * Provides a singleton instance of the notification listener bridge.
 * Automatically selects the real native module when available (Android with
 * expo-dev-client build), or falls back to the mock implementation for
 * development/testing.
 */

export type { RawNotification, INotificationListenerBridge } from './types';
export { NOTIFICATION_RECEIVED_EVENT, SERVICE_STATUS_CHANGED_EVENT } from './types';

import {
  isNativeModuleAvailable,
  nativeNotificationListenerBridge,
} from './NotificationListenerModule';
import { mockNotificationListenerBridge } from './mock';
import type { INotificationListenerBridge } from './types';

/**
 * Singleton notification listener bridge instance.
 * Uses the real native module on Android when available,
 * falls back to mock for development without native build.
 */
export const notificationListenerBridge: INotificationListenerBridge =
  isNativeModuleAvailable()
    ? nativeNotificationListenerBridge
    : mockNotificationListenerBridge;

/**
 * Whether the bridge is using the real native module or the mock.
 * Useful for showing development indicators in the UI.
 */
export const isUsingNativeModule = isNativeModuleAvailable();
