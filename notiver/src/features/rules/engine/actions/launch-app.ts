import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ActionExecutor, ActionResult } from './types';

/**
 * Launch App action executor.
 * Opens a specified app or URL using the system Linking API.
 *
 * Config:
 * - url: string — the URL or deep link to open (defaults to notification's app package)
 * - packageName: string — Android package name to launch (alternative to url)
 */
export const launchAppExecutor: ActionExecutor = {
  async execute(notification: ParsedNotification, config: Record<string, unknown>): Promise<ActionResult> {
    const url = typeof config.url === 'string' ? config.url : '';
    const packageName = typeof config.packageName === 'string' ? config.packageName : notification.packageName;

    const target = url || `market://details?id=${packageName}`;

    try {
      const { Linking } = require('react-native');
      const canOpen = await Linking.canOpenURL(target);

      if (!canOpen) {
        return { success: false, error: `Cannot open URL: ${target}` };
      }

      await Linking.openURL(target);
      console.log(`[Action:LaunchApp] Opened: ${target}`);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown linking error';
      console.warn(`[Action:LaunchApp] Failed to open ${target}: ${message}`);
      return { success: false, error: message };
    }
  },
};
