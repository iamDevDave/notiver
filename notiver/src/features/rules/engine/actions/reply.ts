import type { ParsedNotification } from '../../../../services/notification/parser';
import { accessibilityBridge } from '../../../../native/accessibility';
import type { ActionExecutor, ActionResult } from './types';
import { executeWithRetry } from './accessibility-retry';

/**
 * Reply action executor.
 * Sends an auto-reply to a notification using the AccessibilityService bridge.
 *
 * Uses retry logic: up to 3 retries with exponential backoff (100ms, 400ms, 1600ms).
 * Logs accessibility action events via the event bus.
 *
 * Requirements: 10.2, 10.3, 10.4
 *
 * Config:
 * - message: string — the reply text to send (required)
 */
export const replyExecutor: ActionExecutor = {
  async execute(notification: ParsedNotification, config: Record<string, unknown>): Promise<ActionResult> {
    const message = typeof config.message === 'string' ? config.message : '';

    if (!message) {
      return { success: false, error: 'Reply message is required' };
    }

    const { success, retryCount, error } = await executeWithRetry(
      'auto_reply',
      notification.id,
      notification.packageName,
      () => accessibilityBridge.autoReply(notification.packageName, notification.id, message)
    );

    if (success) {
      return { success: true };
    }

    return {
      success: false,
      error: `Auto-reply failed after ${retryCount} retries: ${error}`,
    };
  },
};
