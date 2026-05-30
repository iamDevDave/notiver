/**
 * Analytics Event Bus Integration.
 * Subscribes to relevant application events and triggers incremental analytics updates.
 * Also invalidates TanStack Query cache so UI reflects the latest data.
 *
 * Validates: Requirement 12.5
 */

import { queryClient } from '@/src/providers/query-provider';
import type { Unsubscribe } from '@/src/services/event-bus';
import { AppEvents, eventBus } from '@/src/services/event-bus';
import { analyticsService } from './index';
import type { AnalyticsEvent } from './types';

/** Query key prefixes that should be invalidated on analytics updates */
const ANALYTICS_QUERY_KEYS = ['analytics', 'dashboard'] as const;

/**
 * Payload shape emitted by the notification:classified event.
 */
interface NotificationClassifiedPayload {
  id: string;
  packageName: string;
  appName: string;
  category?: string;
}

/**
 * Payload shape emitted by the rule:executed event.
 */
interface RuleExecutedPayload {
  ruleId: string;
  notificationId: string;
  status: 'success' | 'partial' | 'failed';
}

/**
 * Payload shape emitted by the focus:session_ended event.
 */
interface FocusSessionEndedPayload {
  sessionId: string;
  actualDurationMin: number;
  blockedCount: number;
}

/**
 * Invalidates all analytics-related TanStack Query caches.
 * This ensures the UI re-fetches fresh data after an incremental update.
 */
function invalidateAnalyticsCache(): void {
  for (const key of ANALYTICS_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

/**
 * Handler for the notification:classified event.
 * Creates an analytics event and triggers an incremental update.
 */
async function handleNotificationClassified(payload: NotificationClassifiedPayload): Promise<void> {
  const event: AnalyticsEvent = {
    type: 'notification_received',
    timestamp: new Date(),
    data: {
      packageName: payload.packageName,
      appName: payload.appName,
      category: payload.category as AnalyticsEvent['data']['category'],
    },
  };

  try {
    await analyticsService.incrementalUpdate(event);
    invalidateAnalyticsCache();
    eventBus.emit(AppEvents.ANALYTICS_UPDATED, { source: 'notification_classified' });
  } catch (error) {
    console.error('[AnalyticsIntegration] Failed to update on notification:classified:', error);
  }
}

/**
 * Handler for the rule:executed event.
 * Creates an analytics event and triggers an incremental update.
 */
async function handleRuleExecuted(payload: RuleExecutedPayload): Promise<void> {
  const event: AnalyticsEvent = {
    type: 'rule_executed',
    timestamp: new Date(),
    data: {
      ruleId: payload.ruleId,
    },
  };

  try {
    await analyticsService.incrementalUpdate(event);
    invalidateAnalyticsCache();
    eventBus.emit(AppEvents.ANALYTICS_UPDATED, { source: 'rule_executed' });
  } catch (error) {
    console.error('[AnalyticsIntegration] Failed to update on rule:executed:', error);
  }
}

/**
 * Handler for the focus:session_ended event.
 * Creates an analytics event and triggers an incremental update.
 */
async function handleFocusSessionEnded(payload: FocusSessionEndedPayload): Promise<void> {
  const event: AnalyticsEvent = {
    type: 'focus_session_ended',
    timestamp: new Date(),
    data: {
      focusMinutes: payload.actualDurationMin,
      blockedCount: payload.blockedCount,
    },
  };

  try {
    await analyticsService.incrementalUpdate(event);
    invalidateAnalyticsCache();
    eventBus.emit(AppEvents.ANALYTICS_UPDATED, { source: 'focus_session_ended' });
  } catch (error) {
    console.error('[AnalyticsIntegration] Failed to update on focus:session_ended:', error);
  }
}

/** Stores unsubscribe functions for cleanup */
let subscriptions: Unsubscribe[] = [];

/**
 * Initialize analytics event bus subscriptions.
 * Call this once during app startup (e.g., in a provider or root layout).
 *
 * Subscribes to:
 * - notification:classified → incremental update with notification data
 * - rule:executed → incremental update with rule execution data
 * - focus:session_ended → incremental update with focus session data
 *
 * Returns a cleanup function that unsubscribes all listeners.
 */
export function initAnalyticsEventIntegration(): Unsubscribe {
  // Clean up any existing subscriptions first (idempotent init)
  disposeAnalyticsEventIntegration();

  subscriptions = [
    eventBus.on<NotificationClassifiedPayload>(
      AppEvents.NOTIFICATION_CLASSIFIED,
      handleNotificationClassified
    ),
    eventBus.on<RuleExecutedPayload>(
      AppEvents.RULE_EXECUTED,
      handleRuleExecuted
    ),
    eventBus.on<FocusSessionEndedPayload>(
      AppEvents.FOCUS_SESSION_ENDED,
      handleFocusSessionEnded
    ),
  ];

  return disposeAnalyticsEventIntegration;
}

/**
 * Dispose all analytics event bus subscriptions.
 * Call this on app teardown or when re-initializing.
 */
export function disposeAnalyticsEventIntegration(): void {
  for (const unsubscribe of subscriptions) {
    unsubscribe();
  }
  subscriptions = [];
}
