import type { ParsedNotification } from '../../../../services/notification/parser';
import type { TriggerHandler } from './types';

/**
 * Location trigger handler.
 * Placeholder implementation - always returns true.
 * Will be implemented when location services are integrated.
 */
export class LocationTriggerHandler implements TriggerHandler {
  evaluate(_notification: ParsedNotification, _config: Record<string, unknown>): boolean {
    // Placeholder: always returns true until location services are available
    return true;
  }
}
