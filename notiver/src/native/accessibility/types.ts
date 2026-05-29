/**
 * Type definitions for the Accessibility Service native module bridge.
 * These types define the contract between the JS layer and the native Android
 * AccessibilityService for performing UI automation actions on notifications.
 */

/**
 * Result of an accessibility action execution.
 * Contains metadata about the action performed for logging purposes.
 */
export interface AccessibilityActionResult {
  /** Whether the action was successfully performed */
  success: boolean;
  /** Type of action that was attempted */
  actionType: AccessibilityActionType;
  /** Package name of the target app */
  packageName: string;
  /** Notification ID that was targeted */
  notificationId: string;
  /** Timestamp when the action was executed */
  timestamp: number;
  /** Number of retry attempts made (0 if succeeded first try) */
  retryCount: number;
  /** Error message if the action failed */
  error?: string;
}

/** Types of accessibility actions that can be performed */
export type AccessibilityActionType =
  | 'dismiss'
  | 'click'
  | 'expand'
  | 'auto_reply';

/**
 * Bridge interface for the Android AccessibilityService native module.
 * Provides methods to check service status and perform UI automation
 * actions on notifications in the notification shade.
 */
export interface IAccessibilityBridge {
  /** Check if the AccessibilityService is currently enabled */
  isEnabled(): Promise<boolean>;

  /**
   * Dismiss a notification from the notification shade.
   * @param packageName - Package name of the app that posted the notification
   * @param notificationId - Unique identifier of the notification
   * @returns Whether the dismiss action was successful
   */
  dismissNotification(
    packageName: string,
    notificationId: string
  ): Promise<boolean>;

  /**
   * Click an action button on a notification.
   * @param packageName - Package name of the app that posted the notification
   * @param actionIndex - Zero-based index of the action button to click
   * @returns Whether the click action was successful
   */
  clickAction(
    packageName: string,
    actionIndex: number
  ): Promise<boolean>;

  /**
   * Expand a notification to show its full content.
   * @param packageName - Package name of the app that posted the notification
   * @param notificationId - Unique identifier of the notification
   * @returns Whether the expand action was successful
   */
  expandNotification(
    packageName: string,
    notificationId: string
  ): Promise<boolean>;

  /**
   * Auto-reply to a notification using the inline reply action.
   * @param packageName - Package name of the app that posted the notification
   * @param notificationId - Unique identifier of the notification
   * @param message - The reply message text to send
   * @returns Whether the auto-reply action was successful
   */
  autoReply(
    packageName: string,
    notificationId: string,
    message: string
  ): Promise<boolean>;
}

/** Event name emitted when the accessibility service status changes */
export const ACCESSIBILITY_SERVICE_STATUS_EVENT = 'onAccessibilityServiceStatusChanged';

/** Event name emitted when an accessibility action is performed */
export const ACCESSIBILITY_ACTION_EVENT = 'onAccessibilityActionPerformed';
