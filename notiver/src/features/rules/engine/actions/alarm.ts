import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ActionExecutor, ActionResult } from './types';

/**
 * Alarm action executor.
 * Sounds an alarm to alert the user about a notification.
 *
 * In production, this will trigger a native alarm sound.
 * For MVP, logs the intent and returns success.
 *
 * Config:
 * - sound: string — alarm sound identifier (default: 'default')
 * - durationMs: number — how long to sound the alarm (default: 5000)
 */
export const alarmExecutor: ActionExecutor = {
  async execute(notification: ParsedNotification, config: Record<string, unknown>): Promise<ActionResult> {
    const sound = typeof config.sound === 'string' ? config.sound : 'default';
    const durationMs = typeof config.durationMs === 'number' ? config.durationMs : 5000;
    console.log(`[Action:Alarm] Sounding alarm "${sound}" for ${durationMs}ms — triggered by ${notification.appName}`);
    // TODO: Implement native alarm sound playback
    return { success: true };
  },
};
