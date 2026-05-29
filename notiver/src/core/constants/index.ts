/**
 * App-wide constants for the Notification Intelligence Platform.
 */

export const APP_NAME = 'Notiver';
export const APP_VERSION = '1.0.0';
export const DATABASE_NAME = 'notiver.db';

/**
 * Event names used across the event bus.
 */
export const Events = {
  // Notification events
  NOTIFICATION_RECEIVED: 'notification:received',
  NOTIFICATION_PARSED: 'notification:parsed',
  NOTIFICATION_CLASSIFIED: 'notification:classified',
  NOTIFICATION_DISMISSED: 'notification:dismissed',

  // Rule events
  RULE_EVALUATED: 'rule:evaluated',
  RULE_EXECUTED: 'rule:executed',
  RULE_CREATED: 'rule:created',
  RULE_UPDATED: 'rule:updated',
  RULE_DELETED: 'rule:deleted',

  // Focus events
  FOCUS_SESSION_STARTED: 'focus:session_started',
  FOCUS_SESSION_PAUSED: 'focus:session_paused',
  FOCUS_SESSION_RESUMED: 'focus:session_resumed',
  FOCUS_SESSION_ENDED: 'focus:session_ended',

  // Analytics events
  ANALYTICS_UPDATED: 'analytics:updated',

  // App lifecycle events
  APP_FOREGROUND: 'app:foreground',
  APP_BACKGROUND: 'app:background',
} as const;

/**
 * Storage keys for MMKV persistent storage.
 */
export const StorageKeys = {
  ONBOARDING_COMPLETED: 'onboarding_completed',
  THEME_PREFERENCE: 'theme_preference',
  FOCUS_ACTIVE_SESSION: 'focus_active_session',
  LAST_SYNC_TIMESTAMP: 'last_sync_timestamp',
} as const;

/**
 * Default pagination values.
 */
export const Pagination = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
