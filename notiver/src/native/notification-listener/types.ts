/**
 * Type definitions for the Notification Listener native module bridge.
 * These types define the contract between the JS layer and the native Android
 * NotificationListenerService.
 */

/**
 * Raw notification data received from the Android NotificationListenerService.
 * This is the unprocessed payload before parsing/classification.
 */
export interface RawNotification {
  /** Unique key identifying this notification in the Android system */
  key: string;
  /** Package name of the app that posted the notification */
  packageName: string;
  /** Human-readable app name */
  appName: string;
  /** Notification title (may be null for some notifications) */
  title: string | null;
  /** Notification content/body text */
  content: string | null;
  /** Sender information extracted from the notification */
  sender: string | null;
  /** Unix timestamp (ms) when the notification was posted */
  timestamp: number;
  /** Android notification priority level */
  priority: number;
  /** Additional notification extras as key-value pairs */
  extras: Record<string, unknown>;
}

/**
 * Bridge interface for the Android NotificationListenerService native module.
 * Provides methods to check service status, restart it, and subscribe to
 * incoming notifications.
 */
export interface INotificationListenerBridge {
  /** Check if the NotificationListenerService is currently running */
  isRunning(): Promise<boolean>;
  /** Request the system to restart the NotificationListenerService */
  requestRestart(): Promise<void>;
  /**
   * Subscribe to incoming notifications.
   * @param handler - Callback invoked with each raw notification
   * @returns Unsubscribe function to stop receiving notifications
   */
  onNotificationReceived(handler: (raw: RawNotification) => void): () => void;
}

/** Event name emitted by the native module when a notification is received */
export const NOTIFICATION_RECEIVED_EVENT = 'onNotificationReceived';

/** Event name emitted by the native module when service status changes */
export const SERVICE_STATUS_CHANGED_EVENT = 'onServiceStatusChanged';
