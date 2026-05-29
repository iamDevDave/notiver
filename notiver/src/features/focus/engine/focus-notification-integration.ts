/**
 * Focus Engine ↔ Notification Pipeline Integration.
 *
 * Subscribes to "notification:received" events and checks whether the
 * notification should be blocked by the active focus session.
 *
 * Behavior:
 * - If focus mode is active and the notification's app is blocked → suppress it,
 *   increment blockedCount, and emit "focus:notification_blocked".
 * - If focus mode is active but the notification's app is NOT blocked → it passes
 *   through, but we increment interruptionCount (it's still a distraction during focus).
 * - If no focus session is active → notification passes through unaffected.
 *
 * @module focus-notification-integration
 * @validates Requirements 11.2
 */

import { eventBus, AppEvents } from '../../../services/event-bus';
import type { Unsubscribe } from '../../../services/event-bus';
import { focusEngine } from './engine';
import type { ParsedNotification } from '../../../services/notification/parser';

export interface FocusNotificationBlockedEvent {
  sessionId: string;
  packageName: string;
  appName: string;
  blockedCount: number;
  timestamp: Date;
}

/**
 * Handles an incoming notification event and applies focus mode blocking logic.
 *
 * @param notification - The parsed notification from the pipeline
 */
async function handleNotificationReceived(notification: ParsedNotification): Promise<void> {
  const currentSession = focusEngine.getCurrentSession();

  // No active session — nothing to do
  if (!currentSession) {
    return;
  }

  // Session must be active to block (paused sessions don't block)
  if (currentSession.status !== 'active') {
    return;
  }

  const packageName = notification.packageName;

  if (focusEngine.isBlocked(packageName)) {
    // Notification is from a blocked app — suppress it
    await focusEngine.incrementBlockedCount(currentSession.id);

    const blockedEvent: FocusNotificationBlockedEvent = {
      sessionId: currentSession.id,
      packageName,
      appName: notification.appName,
      blockedCount: currentSession.blockedCount + 1,
      timestamp: new Date(),
    };

    eventBus.emit(AppEvents.FOCUS_NOTIFICATION_BLOCKED, blockedEvent);
  } else {
    // Notification from a non-blocked app during focus — counts as an interruption
    await focusEngine.incrementInterruptionCount(currentSession.id);
  }
}

let unsubscribe: Unsubscribe | null = null;

/**
 * Start the focus-notification integration.
 * Subscribes to "notification:received" events on the event bus.
 */
export function startFocusNotificationIntegration(): void {
  if (unsubscribe) {
    // Already running
    return;
  }

  unsubscribe = eventBus.on<ParsedNotification>(
    AppEvents.NOTIFICATION_RECEIVED,
    (notification) => {
      handleNotificationReceived(notification).catch((error) => {
        console.error(
          '[FocusNotificationIntegration] Error handling notification:',
          error instanceof Error ? error.message : error
        );
      });
    }
  );
}

/**
 * Stop the focus-notification integration.
 * Unsubscribes from the event bus.
 */
export function stopFocusNotificationIntegration(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
