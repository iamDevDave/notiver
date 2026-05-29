import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ActionExecutor, ActionResult } from './types';

/**
 * Vibrate action executor.
 * Vibrates the device to alert the user about a notification.
 *
 * Uses expo-haptics for haptic feedback. Falls back to logging if unavailable.
 *
 * Config:
 * - pattern: 'light' | 'medium' | 'heavy' — vibration intensity (default: 'medium')
 */
export const vibrateExecutor: ActionExecutor = {
  async execute(notification: ParsedNotification, config: Record<string, unknown>): Promise<ActionResult> {
    const pattern = typeof config.pattern === 'string' ? config.pattern : 'medium';

    try {
      const Haptics = require('expo-haptics');
      const impactStyle =
        pattern === 'light'
          ? Haptics.ImpactFeedbackStyle.Light
          : pattern === 'heavy'
            ? Haptics.ImpactFeedbackStyle.Heavy
            : Haptics.ImpactFeedbackStyle.Medium;

      await Haptics.impactAsync(impactStyle);
      console.log(`[Action:Vibrate] Vibrated (${pattern}) — triggered by ${notification.appName}`);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown haptics error';
      console.warn(`[Action:Vibrate] Haptics unavailable: ${message}`);
      return { success: false, error: message };
    }
  },
};
