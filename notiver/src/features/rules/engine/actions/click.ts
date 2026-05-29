import type { ParsedNotification } from '../../../../services/notification/parser';
import { accessibilityBridge } from '../../../../native/accessibility';
import type { ActionExecutor, ActionResult } from './types';
import { executeWithRetry } from './accessibility-retry';

/**
 * Click action executor.
 * Clicks an action button on a notification using the AccessibilityService bridge.
 *
 * Uses retry logic: up to 3 retries with exponential backoff (100ms, 400ms, 1600ms).
 * Logs accessibility action events via the event bus.
 *
 * Requirements: 10.2, 10.3, 10.4
 *
 * Config:
 * - actionIndex: number — zero-based index of the action button to click (default: 0)
 */
export const clickExecutor: ActionExecutor = {
  async execute(notification: ParsedNotification, config: Record<string, unknown>): Promise<ActionResult> {
    const actionIndex = typeof config.actionIndex === 'number' ? config.actionIndex : 0;

    if (actionIndex < 0 || !Number.isInteger(actionIndex)) {
      return { success: false, error: 'actionIndex must be a non-negative integer' };
    }

    const { success, retryCount, error } = await executeWithRetry(
      'click',
      notification.id,
      notification.packageName,
      () => accessibilityBridge.clickAction(notification.packageName, actionIndex)
    );

    if (success) {
      return { success: true };
    }

    return {
      success: false,
      error: `Click action failed after ${retryCount} retries: ${error}`,
    };
  },
};
