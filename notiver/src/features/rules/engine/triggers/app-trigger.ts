import type { ParsedNotification } from '../../../../services/notification/parser';
import type { TriggerHandler, AppTriggerConfig } from './types';

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

    if (triggerConfig.apps.length === 0) {
      return false;
    }

    return triggerConfig.apps.some(
      (app) => app.toLowerCase() === notification.packageName.toLowerCase()
    );
  }
}
