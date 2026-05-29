import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ActionExecutor, ActionResult } from './types';

/**
 * Batch action executor.
 * Groups notifications together for batched delivery at a later time.
 *
 * In production, this will add the notification to a batch queue and deliver
 * all batched notifications at the configured interval. For MVP, logs the intent.
 *
 * Config:
 * - batchKey: string — grouping key for the batch (default: app package name)
 * - intervalMs: number — delivery interval in milliseconds (default: 300000 = 5 min)
 */
export const batchExecutor: ActionExecutor = {
  async execute(notification: ParsedNotification, config: Record<string, unknown>): Promise<ActionResult> {
    const batchKey = typeof config.batchKey === 'string' ? config.batchKey : notification.packageName;
    const intervalMs = typeof config.intervalMs === 'number' ? config.intervalMs : 300000;
    console.log(`[Action:Batch] Batching notification from ${notification.appName} under key "${batchKey}" (interval: ${intervalMs}ms)`);
    // TODO: Implement batch queue with scheduled delivery
    return { success: true };
  },
};
