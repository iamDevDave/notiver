import type { ParsedNotification } from '../../../../services/notification/parser';
import type { TriggerType } from '../../../../database/schema/rules';

/**
 * Interface for trigger handlers that evaluate whether a notification
 * matches a specific trigger condition.
 */
export interface TriggerHandler {
  /**
   * Evaluates whether the given notification matches the trigger configuration.
   * @param notification - The parsed notification to evaluate
   * @param config - Trigger-specific configuration (parsed from JSON triggerConfig)
   * @returns true if the notification matches the trigger, false otherwise
   */
  evaluate(notification: ParsedNotification, config: Record<string, unknown>): boolean;
}

/**
 * Configuration for the App trigger.
 * Matches notifications from specific package names.
 */
export interface AppTriggerConfig {
  apps: string[];
}

/**
 * Configuration for the Keyword trigger.
 * Matches notifications containing any of the specified keywords in title or content.
 */
export interface KeywordTriggerConfig {
  keywords: string[];
  caseSensitive?: boolean;
}

/**
 * Configuration for the Contact trigger.
 * Matches notifications from specific senders.
 */
export interface ContactTriggerConfig {
  contacts: string[];
}

/**
 * Configuration for the Time trigger.
 * Matches notifications received within a time window.
 * Times are in HH:mm format (24-hour).
 */
export interface TimeTriggerConfig {
  startTime: string;
  endTime: string;
}

/**
 * Configuration for the Location trigger.
 * Placeholder - not yet implemented.
 */
export interface LocationTriggerConfig {
  latitude?: number;
  longitude?: number;
  radius?: number;
}

/**
 * Configuration for the Frequency trigger.
 * Placeholder - always returns true for now.
 */
export interface FrequencyTriggerConfig {
  maxCount?: number;
  timeWindowMinutes?: number;
}

export type { TriggerType };
