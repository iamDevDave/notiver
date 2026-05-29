import type { ParsedNotification } from '../../../../services/notification/parser';
import type { TriggerHandler } from './types';

/**
 * Frequency trigger handler.
 * Placeholder implementation - always returns true.
 * Will be implemented with count-based logic when notification history
 * tracking per time window is available.
 */
export class FrequencyTriggerHandler implements TriggerHandler {
  evaluate(_notification: ParsedNotification, _config: Record<string, unknown>): boolean {
    // Placeholder: always returns true until frequency tracking is implemented
    return true;
  }
}
