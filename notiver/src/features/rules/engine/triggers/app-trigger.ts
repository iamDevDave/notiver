import type { ParsedNotification } from '../../../../services/notification/parser';
import type { AppTriggerConfig, TriggerHandler } from './types';

/**
 * App trigger handler.
 * Matches if the notification's packageName is in the configured apps array.
 */
export class AppTriggerHandler implements TriggerHandler {
  evaluate(notification: ParsedNotification, config: Record<string, unknown>): boolean {
    const triggerConfig = config as unknown as AppTriggerConfig;

    if (!triggerConfig.apps || !Array.isArray(triggerConfig.apps)) {
      return false;
    }

    const normalizedPackageName = notification.packageName?.toLowerCase?.();
    if (!normalizedPackageName) {
      return false;
    }

    const normalizedApps = triggerConfig.apps
      .filter((app): app is string => typeof app === 'string' && app.trim().length > 0)
      .map((app) => app.toLowerCase());

    if (normalizedApps.length === 0) {
      return false;
    }

    return normalizedApps.includes(normalizedPackageName);
  }
}
