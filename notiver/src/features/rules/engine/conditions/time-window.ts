import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ConditionConfig, ConditionEvaluator } from './types';

/**
 * Parses a time string in HH:MM format to total minutes since midnight.
 * Returns null if the format is invalid.
 */
function parseTimeToMinutes(timeStr: string): number | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/**
 * Gets the current time in minutes since midnight.
 * Extracted as a function to allow testing with dependency injection.
 */
function getCurrentTimeMinutes(now?: Date): number {
  const date = now ?? new Date();
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Time Window condition evaluator.
 * Checks if the current time falls within the specified start and end time window.
 *
 * Config:
 * - value: time window in "HH:MM-HH:MM" format (startTime-endTime)
 * - operator: 'within' (default) or 'outside'
 *
 * Supports overnight windows (e.g., "22:00-06:00" means 10 PM to 6 AM).
 * If the time format is invalid, the condition evaluates to false.
 */
export const timeWindowEvaluator: ConditionEvaluator = {
  evaluate(notification: ParsedNotification, config: ConditionConfig): boolean {
    const timeRange = config.value || '';
    const parts = timeRange.split('-');

    if (parts.length !== 2) return false;

    const startMinutes = parseTimeToMinutes(parts[0].trim());
    const endMinutes = parseTimeToMinutes(parts[1].trim());

    if (startMinutes === null || endMinutes === null) return false;

    const currentMinutes = getCurrentTimeMinutes();
    const operator = config.operator || 'within';

    let isWithin: boolean;

    if (startMinutes <= endMinutes) {
      // Normal window (e.g., 09:00-17:00)
      isWithin = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight window (e.g., 22:00-06:00)
      isWithin = currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return operator === 'outside' ? !isWithin : isWithin;
  },
};

/**
 * Creates a time window evaluator with a custom time provider.
 * Useful for testing without depending on the system clock.
 */
export function createTimeWindowEvaluator(now: Date): ConditionEvaluator {
  return {
    evaluate(notification: ParsedNotification, config: ConditionConfig): boolean {
      const timeRange = config.value || '';
      const parts = timeRange.split('-');

      if (parts.length !== 2) return false;

      const startMinutes = parseTimeToMinutes(parts[0].trim());
      const endMinutes = parseTimeToMinutes(parts[1].trim());

      if (startMinutes === null || endMinutes === null) return false;

      const currentMinutes = getCurrentTimeMinutes(now);
      const operator = config.operator || 'within';

      let isWithin: boolean;

      if (startMinutes <= endMinutes) {
        isWithin = currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        isWithin = currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }

      return operator === 'outside' ? !isWithin : isWithin;
    },
  };
}

export { parseTimeToMinutes, getCurrentTimeMinutes };
