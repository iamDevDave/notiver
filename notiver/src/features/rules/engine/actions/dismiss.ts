import type { ParsedNotification } from '../../../../services/notification/parser';
import { accessibilityBridge } from '../../../../native/accessibility';
import type { ActionExecutor, ActionResult } from './types';
import { executeWithRetry } from './accessibility-retry';

/**
 * Dismiss action executor.
 * Dismisses a notification from the notification shade using the AccessibilityService bridge.
 *
 * Uses retry logic: up to 3 retries with exponential backoff (100ms, 400ms, 1600ms).
 * Logs accessibility action events via the event bus.
 *
 * Requirements: 10.2, 10.3, 10.4
 *
 * Config: (none required)
 */
export const dismissExecutor: ActionExecutor = {
  async execute(notification: ParsedNotification, _config: Record<string, unknown>): Promise<ActionResult> {
    const { success, retryCount, error } = await executeWithRetry(
      'dismiss',
      notification.id,
      notification.packageName,
      () => accessibilityBridge.dismissNotification(notification.packageName, notification.id)
    );

    if (success) {
      return { success: true };
    }

    return {
      success: false,
      error: `Dismiss failed after ${retryCount} retries: ${error}`,
    };
  },
};
