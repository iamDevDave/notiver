/**
 * Event Bus type definitions and interface.
 * Used for cross-feature communication throughout the application.
 */

/** Handler function type for event subscriptions */
export type EventHandler<T = unknown> = (payload: T) => void;

/** Unsubscribe function returned by on() */
export type Unsubscribe = () => void;

/**
 * Event Bus interface for cross-feature communication.
 * Features should import and use this interface for loose coupling.
 */
export interface IEventBus {
  /** Emit an event with a typed payload to all registered handlers */
  emit<T>(event: string, payload: T): void;

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<T>(event: string, handler: EventHandler<T>): Unsubscribe;

  /** Unsubscribe a specific handler from an event */
  off(event: string, handler: EventHandler): void;
}

/**
 * Known event names used across the application.
 * Using constants prevents typos and enables autocomplete.
 */
export const AppEvents = {
  // Notification pipeline events
  NOTIFICATION_RECEIVED: 'notification:received',
  NOTIFICATION_PARSED: 'notification:parsed',
  NOTIFICATION_CLASSIFIED: 'notification:classified',

  // Rule engine events
  RULE_EXECUTED: 'rule:executed',
  RULE_FAILED: 'rule:failed',
  RULE_UPDATED: 'rule:updated',

  // Accessibility action events
  ACCESSIBILITY_ACTION_EXECUTED: 'accessibility:action_executed',

  // Focus mode events
  FOCUS_SESSION_STARTED: 'focus:session_started',
  FOCUS_SESSION_ENDED: 'focus:session_ended',
  FOCUS_SESSION_PAUSED: 'focus:session_paused',
  FOCUS_SESSION_RESUMED: 'focus:session_resumed',
  FOCUS_NOTIFICATION_BLOCKED: 'focus:notification_blocked',

  // Analytics events
  ANALYTICS_UPDATED: 'analytics:updated',
} as const;

export type AppEventName = (typeof AppEvents)[keyof typeof AppEvents];
