import type { ParsedNotification } from '../../../../services/notification/parser';
import type { TriggerHandler, TimeTriggerConfig } from './types';

/**
 * Parses a time string in HH:mm format to total minutes since midnight.
 * Returns null if the format is invalid.
 */
function parseTimeToMinutes(time: string): number | null {
  if (!time || typeof time !== 'string') {
    return null;
  }

  const parts = time.split(':');
  if (parts.length !== 2) {
    return null;
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) {
    return null;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

/**
 * Time trigger handler.
 * Matches if the current time is within the configured startTime/endTime window.
 * Supports overnight windows (e.g., startTime: "22:00", endTime: "06:00").
 */
export class TimeTriggerHandler implements TriggerHandler {
  evaluate(notification: ParsedNotification, config: Record<string, unknown>): boolean {
    const triggerConfig = config as unknown as TimeTriggerConfig;

    if (!triggerConfig.startTime || !triggerConfig.endTime) {
      return false;
    }

    const startMinutes = parseTimeToMinutes(triggerConfig.startTime);
    const endMinutes = parseTimeToMinutes(triggerConfig.endTime);

    if (startMinutes === null || endMinutes === null) {
      return false;
    }

    const now = notification.receivedAt;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Handle overnight windows (e.g., 22:00 to 06:00)
    if (startMinutes <= endMinutes) {
      // Normal window (e.g., 09:00 to 17:00)
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Overnight window (e.g., 22:00 to 06:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }
}
