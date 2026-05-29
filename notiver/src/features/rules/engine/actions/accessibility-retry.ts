/**
 * Retry utility for accessibility actions.
 * Implements exponential backoff: 100ms, 400ms, 1600ms (base * 4^attempt).
 *
 * Requirements: 10.4 - Retry up to 3 times with exponential backoff before marking as failed.
 */

import { eventBus } from '../../../../services/event-bus';
import type { AccessibilityActionType } from '../../../../native/accessibility';

/** Event name for accessibility action logging */
export const ACCESSIBILITY_ACTION_LOG_EVENT = 'accessibility:action_executed';

/** Payload emitted when an accessibility action is executed */
export interface AccessibilityActionLogEvent {
  /** Type of accessibility action performed */
  actionType: AccessibilityActionType;
  /** Notification ID that was targeted */
  targetNotificationId: string;
  /** Package name of the target app */
  packageName: string;
  /** Whether the action ultimately succeeded */
  success: boolean;
  /** ISO timestamp of when the action completed */
  timestamp: string;
  /** Number of retry attempts made (0 = succeeded first try, max 3) */
  retryCount: number;
  /** Error message if the action failed */
  error?: string;
}

/** Retry configuration */
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;

/**
 * Calculates the delay for a given retry attempt using exponential backoff.
 * Formula: base * 4^attempt → 100ms, 400ms, 1600ms
 */
export function calculateBackoffDelay(attempt: number): number {
  return BASE_DELAY_MS * Math.pow(4, attempt);
}

/**
 * Delays execution for the specified number of milliseconds.
 * Exposed for testing override.
 */
export let delayFn = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Override the delay function (useful for testing to skip real waits).
 */
export function setDelayFn(fn: (ms: number) => Promise<void>): void {
  delayFn = fn;
}

/**
 * Executes an accessibility action with retry logic and logging.
 *
 * - Retries up to 3 times with exponential backoff (100ms, 400ms, 1600ms)
 * - Logs the action event via the event bus after completion
 * - Returns success/failure with retry count
 *
 * @param actionType - The type of accessibility action being performed
 * @param targetNotificationId - The notification ID being acted upon
 * @param packageName - The package name of the notification's app
 * @param actionFn - The async function that performs the actual accessibility action
 * @returns Object with success status, retry count, and optional error
 */
export async function executeWithRetry(
  actionType: AccessibilityActionType,
  targetNotificationId: string,
  packageName: string,
  actionFn: () => Promise<boolean>
): Promise<{ success: boolean; retryCount: number; error?: string }> {
  let lastError: string | undefined;
  let retryCount = 0;

  // First attempt (not a retry)
  try {
    const result = await actionFn();
    if (result) {
      logAccessibilityAction(actionType, targetNotificationId, packageName, true, 0);
      return { success: true, retryCount: 0 };
    }
    lastError = `${actionType} action returned false`;
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'Unknown error';
  }

  // Retry attempts (up to 3)
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const backoffMs = calculateBackoffDelay(attempt);
    await delayFn(backoffMs);
    retryCount = attempt + 1;

    try {
      const result = await actionFn();
      if (result) {
        logAccessibilityAction(actionType, targetNotificationId, packageName, true, retryCount);
        return { success: true, retryCount };
      }
      lastError = `${actionType} action returned false after retry ${retryCount}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // All retries exhausted
  logAccessibilityAction(actionType, targetNotificationId, packageName, false, retryCount, lastError);
  return { success: false, retryCount, error: lastError };
}

/**
 * Logs an accessibility action event to the event bus.
 */
function logAccessibilityAction(
  actionType: AccessibilityActionType,
  targetNotificationId: string,
  packageName: string,
  success: boolean,
  retryCount: number,
  error?: string
): void {
  const logEvent: AccessibilityActionLogEvent = {
    actionType,
    targetNotificationId,
    packageName,
    success,
    timestamp: new Date().toISOString(),
    retryCount,
    ...(error && { error }),
  };

  eventBus.emit(ACCESSIBILITY_ACTION_LOG_EVENT, logEvent);

  const status = success ? 'succeeded' : 'failed';
  const retryInfo = retryCount > 0 ? ` (${retryCount} retries)` : '';
  console.log(
    `[Accessibility:${actionType}] ${status} for ${packageName}:${targetNotificationId}${retryInfo}`
  );
}
