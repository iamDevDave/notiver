/**
 * App Initialization Module.
 *
 * Wires all event bus integrations together on app startup.
 * Ensures the correct event flow:
 *   notification:received → notification:parsed → notification:classified
 *   → rule evaluation → rule:executed → analytics update
 *
 * Also wires:
 *   - Focus mode integration (blocks notifications before rule evaluation)
 *   - TanStack Query cache invalidation on all relevant events
 *
 * Performance target: app reaches interactive state within 2 seconds.
 *
 * @validates Requirements 15.4, 15.7
 */

import { classificationService } from '@/src/features/ai/engine';
import {
    startFocusNotificationIntegration,
    stopFocusNotificationIntegration,
} from '@/src/features/focus/engine';
import { ruleEngine } from '@/src/features/rules/engine/engine';
import { queryClient } from '@/src/providers/query-provider';
import {
    disposeAnalyticsEventIntegration,
    initAnalyticsEventIntegration,
} from '@/src/services/analytics';
import type { Unsubscribe } from '@/src/services/event-bus';
import { AppEvents, eventBus } from '@/src/services/event-bus';
import { notificationService } from '@/src/services/notification';

/**
 * Query keys that should be invalidated when notifications change.
 */
const NOTIFICATION_QUERY_KEYS = ['notifications', 'notification-detail'] as const;

/**
 * Query keys that should be invalidated when rules execute.
 */
const RULE_QUERY_KEYS = ['rules', 'rule-executions', 'rule-detail'] as const;

/**
 * Query keys that should be invalidated when focus sessions change.
 */
const FOCUS_QUERY_KEYS = ['focus-sessions', 'focus-active'] as const;

/** Tracks whether the app has been initialized */
let isInitialized = false;

const globalAppInitState = globalThis as typeof globalThis & {
  __notiverAppInitState?: {
    isInitialized: boolean;
  };
};

function getGlobalInitState(): { isInitialized: boolean } {
  if (!globalAppInitState.__notiverAppInitState) {
    globalAppInitState.__notiverAppInitState = { isInitialized: false };
  }

  return globalAppInitState.__notiverAppInitState;
}

/** Stores cache invalidation unsubscribe functions */
let cacheInvalidationSubscriptions: Unsubscribe[] = [];

/**
 * Set up TanStack Query cache invalidation on relevant event bus events.
 *
 * This ensures the UI always reflects the latest data after:
 * - A notification is received/classified
 * - A rule is executed
 * - A focus session changes
 */
function setupCacheInvalidation(): void {
  // Invalidate notification queries when a new notification is classified
  const unsubClassified = eventBus.on(AppEvents.NOTIFICATION_CLASSIFIED, () => {
    for (const key of NOTIFICATION_QUERY_KEYS) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
    // Dashboard also needs refresh
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  });

  // Invalidate notification queries when a notification is received
  const unsubReceived = eventBus.on(AppEvents.NOTIFICATION_RECEIVED, () => {
    for (const key of NOTIFICATION_QUERY_KEYS) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  });

  // Invalidate rule queries when a rule is executed
  const unsubRuleExecuted = eventBus.on(AppEvents.RULE_EXECUTED, () => {
    for (const key of RULE_QUERY_KEYS) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  });

  // Invalidate focus queries when a session starts/ends/pauses/resumes
  const unsubFocusStarted = eventBus.on(AppEvents.FOCUS_SESSION_STARTED, () => {
    for (const key of FOCUS_QUERY_KEYS) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  });

  const unsubFocusEnded = eventBus.on(AppEvents.FOCUS_SESSION_ENDED, () => {
    for (const key of FOCUS_QUERY_KEYS) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  });

  const unsubFocusPaused = eventBus.on(AppEvents.FOCUS_SESSION_PAUSED, () => {
    for (const key of FOCUS_QUERY_KEYS) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  });

  const unsubFocusResumed = eventBus.on(AppEvents.FOCUS_SESSION_RESUMED, () => {
    for (const key of FOCUS_QUERY_KEYS) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  });

  // Invalidate focus queries when a notification is blocked
  const unsubFocusBlocked = eventBus.on(AppEvents.FOCUS_NOTIFICATION_BLOCKED, () => {
    for (const key of FOCUS_QUERY_KEYS) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  });

  cacheInvalidationSubscriptions = [
    unsubClassified,
    unsubReceived,
    unsubRuleExecuted,
    unsubFocusStarted,
    unsubFocusEnded,
    unsubFocusPaused,
    unsubFocusResumed,
    unsubFocusBlocked,
  ];
}

/**
 * Tear down cache invalidation subscriptions.
 */
function teardownCacheInvalidation(): void {
  for (const unsubscribe of cacheInvalidationSubscriptions) {
    unsubscribe();
  }
  cacheInvalidationSubscriptions = [];
}

/**
 * Initialize all app event bus integrations.
 *
 * This is the single entry point for wiring the entire event-driven pipeline.
 * Call this once after the database is ready (inside a provider or root layout).
 *
 * Initialization order matters:
 * 1. Focus notification integration (subscribes to notification:received — blocks before rule eval)
 * 2. Classification service (subscribes to notification:parsed — emits notification:classified)
 * 3. Rule engine (subscribes to notification:classified — emits rule:executed)
 * 4. Analytics event integration (subscribes to notification:classified, rule:executed, focus:session_ended)
 * 5. Cache invalidation (subscribes to all relevant events for UI freshness)
 * 6. Notification service (subscribes to native bridge — emits notification:received, notification:parsed)
 *
 * The notification service is started last so all downstream subscribers are ready
 * before any notifications flow through the pipeline.
 */
export function initializeApp(): void {
  const initState = getGlobalInitState();

  if (isInitialized || initState.isInitialized) {
    console.warn('[AppInit] Already initialized. Call teardownApp() first.');
    return;
  }

  const startTime = performance.now();

  // 1. Focus mode integration — must be first to block notifications before rule evaluation
  startFocusNotificationIntegration();

  // 2. AI Classification service — subscribes to notification:parsed
  classificationService.start();

  // 3. Rule engine — subscribes to notification:classified
  ruleEngine.start();

  // 4. Analytics event integration — subscribes to classified, rule:executed, focus:session_ended
  initAnalyticsEventIntegration();

  // 5. Cache invalidation — subscribes to all relevant events
  setupCacheInvalidation();

  // 6. Notification service — starts the pipeline (emits notification:received, notification:parsed)
  notificationService.start();

  isInitialized = true;
  initState.isInitialized = true;

  const duration = performance.now() - startTime;
  console.log(`[AppInit] All integrations wired in ${duration.toFixed(1)}ms`);
}

/**
 * Tear down all app event bus integrations.
 * Call this on app shutdown or for testing cleanup.
 */
export function teardownApp(): void {
  const initState = getGlobalInitState();

  if (!isInitialized && !initState.isInitialized) {
    return;
  }

  // Tear down in reverse order
  notificationService.stop();
  teardownCacheInvalidation();
  disposeAnalyticsEventIntegration();
  ruleEngine.stop();
  classificationService.stop();
  stopFocusNotificationIntegration();

  isInitialized = false;
  initState.isInitialized = false;
  console.log('[AppInit] All integrations torn down');
}

/**
 * Check if the app has been initialized.
 */
export function getIsInitialized(): boolean {
  return isInitialized || getGlobalInitState().isInitialized;
}
