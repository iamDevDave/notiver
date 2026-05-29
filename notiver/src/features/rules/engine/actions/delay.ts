import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ActionExecutor, ActionResult } from './types';

/**
 * Delay action executor.
 * Delays notification delivery by a specified duration.
 *
 * In production, this will schedule the notification to reappear after the delay.
 * For MVP, logs the intent and returns success.
 *
 * Config:
 * - durationMs: number — delay duration in milliseconds (default: 60000)
 */
export const delayExecutor: ActionExecutor = {
  async execute(notification: ParsedNotification, config: Record<string, unknown>): Promise<ActionResult> {
    const durationMs = typeof config.durationMs === 'number' ? config.durationMs : 60000;
    console.log(`[Action:Delay] Delaying notification from ${notification.appName} by ${durationMs}ms`);
    // TODO: Implement scheduling via native alarm/timer service
    return { success: true };
  },
};
