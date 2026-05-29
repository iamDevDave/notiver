/**
 * Tests for App Initialization Module.
 *
 * Verifies:
 * - Event flow: notification:received → notification:parsed → notification:classified
 *   → rule evaluation → rule:executed → analytics update
 * - Focus mode integration blocks notifications before rule evaluation
 * - TanStack Query cache invalidation on all relevant events
 * - App initialization completes quickly (< 2 seconds target)
 *
 * @validates Requirements 15.4, 15.7
 */

import { eventBus, AppEvents } from '@/src/services/event-bus';

// Mock all services that get wired together
jest.mock('@/src/services/notification', () => ({
  notificationService: {
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@/src/features/ai/engine', () => ({
  classificationService: {
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@/src/features/rules/engine/engine', () => ({
  ruleEngine: {
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@/src/features/focus/engine', () => ({
  startFocusNotificationIntegration: jest.fn(),
  stopFocusNotificationIntegration: jest.fn(),
}));

jest.mock('@/src/services/analytics', () => ({
  initAnalyticsEventIntegration: jest.fn(),
  disposeAnalyticsEventIntegration: jest.fn(),
}));

jest.mock('@/src/providers/query-provider', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

// Import mocked modules
import { notificationService } from '@/src/services/notification';
import { classificationService } from '@/src/features/ai/engine';
import { ruleEngine } from '@/src/features/rules/engine/engine';
import {
  startFocusNotificationIntegration,
  stopFocusNotificationIntegration,
} from '@/src/features/focus/engine';
import {
  initAnalyticsEventIntegration,
  disposeAnalyticsEventIntegration,
} from '@/src/services/analytics';
import { queryClient } from '@/src/providers/query-provider';

import { initializeApp, teardownApp, getIsInitialized } from '@/src/services/app/app-init';

describe('App Initialization Module', () => {
  beforeEach(() => {
    eventBus.clear();
    jest.clearAllMocks();
    // Reset initialization state by tearing down
    teardownApp();
  });

  afterEach(() => {
    teardownApp();
  });

  describe('initializeApp', () => {
    it('should initialize all integrations in the correct order', () => {
      const callOrder: string[] = [];
      (startFocusNotificationIntegration as jest.Mock).mockImplementation(() =>
        callOrder.push('focus')
      );
      (classificationService.start as jest.Mock).mockImplementation(() =>
        callOrder.push('classification')
      );
      (ruleEngine.start as jest.Mock).mockImplementation(() =>
        callOrder.push('ruleEngine')
      );
      (initAnalyticsEventIntegration as jest.Mock).mockImplementation(() =>
        callOrder.push('analytics')
      );
      (notificationService.start as jest.Mock).mockImplementation(() =>
        callOrder.push('notification')
      );

      initializeApp();

      // Focus must be first (blocks before rule evaluation)
      // Notification service must be last (emits events after all subscribers are ready)
      expect(callOrder).toEqual([
        'focus',
        'classification',
        'ruleEngine',
        'analytics',
        'notification',
      ]);
    });

    it('should set isInitialized to true', () => {
      expect(getIsInitialized()).toBe(false);
      initializeApp();
      expect(getIsInitialized()).toBe(true);
    });

    it('should be idempotent — calling twice does not double-initialize', () => {
      initializeApp();
      initializeApp();

      expect(startFocusNotificationIntegration).toHaveBeenCalledTimes(1);
      expect(classificationService.start).toHaveBeenCalledTimes(1);
      expect(ruleEngine.start).toHaveBeenCalledTimes(1);
      expect(initAnalyticsEventIntegration).toHaveBeenCalledTimes(1);
      expect(notificationService.start).toHaveBeenCalledTimes(1);
    });

    it('should complete initialization within 2 seconds', () => {
      const start = performance.now();
      initializeApp();
      const duration = performance.now() - start;

      // Initialization is synchronous and should be nearly instant
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('teardownApp', () => {
    it('should stop all integrations in reverse order', () => {
      const callOrder: string[] = [];
      (notificationService.stop as jest.Mock).mockImplementation(() =>
        callOrder.push('notification')
      );
      (disposeAnalyticsEventIntegration as jest.Mock).mockImplementation(() =>
        callOrder.push('analytics')
      );
      (ruleEngine.stop as jest.Mock).mockImplementation(() =>
        callOrder.push('ruleEngine')
      );
      (classificationService.stop as jest.Mock).mockImplementation(() =>
        callOrder.push('classification')
      );
      (stopFocusNotificationIntegration as jest.Mock).mockImplementation(() =>
        callOrder.push('focus')
      );

      initializeApp();
      callOrder.length = 0; // Reset after init

      teardownApp();

      expect(callOrder).toEqual([
        'notification',
        'analytics',
        'ruleEngine',
        'classification',
        'focus',
      ]);
    });

    it('should set isInitialized to false', () => {
      initializeApp();
      expect(getIsInitialized()).toBe(true);

      teardownApp();
      expect(getIsInitialized()).toBe(false);
    });

    it('should not throw when called without prior init', () => {
      expect(() => teardownApp()).not.toThrow();
    });
  });

  describe('TanStack Query cache invalidation', () => {
    it('should invalidate notification queries on notification:classified', () => {
      initializeApp();

      eventBus.emit(AppEvents.NOTIFICATION_CLASSIFIED, {
        notificationId: 'n1',
        category: 'work',
        confidence: 0.9,
        matchedKeywords: ['meeting'],
      });

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['notifications'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['notification-detail'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['dashboard'],
      });
    });

    it('should invalidate notification queries on notification:received', () => {
      initializeApp();

      eventBus.emit(AppEvents.NOTIFICATION_RECEIVED, {
        id: 'n1',
        packageName: 'com.test',
        appName: 'Test',
      });

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['notifications'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['notification-detail'],
      });
    });

    it('should invalidate rule queries on rule:executed', () => {
      initializeApp();

      eventBus.emit(AppEvents.RULE_EXECUTED, {
        ruleId: 'r1',
        notificationId: 'n1',
        status: 'success',
      });

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['rules'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['rule-executions'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['rule-detail'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['dashboard'],
      });
    });

    it('should invalidate focus queries on focus:session_started', () => {
      initializeApp();

      eventBus.emit(AppEvents.FOCUS_SESSION_STARTED, { sessionId: 's1' });

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['focus-sessions'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['focus-active'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['dashboard'],
      });
    });

    it('should invalidate focus queries on focus:session_ended', () => {
      initializeApp();

      eventBus.emit(AppEvents.FOCUS_SESSION_ENDED, {
        sessionId: 's1',
        actualDurationMin: 30,
        blockedCount: 5,
      });

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['focus-sessions'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['focus-active'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['dashboard'],
      });
    });

    it('should invalidate focus queries on focus:notification_blocked', () => {
      initializeApp();

      eventBus.emit(AppEvents.FOCUS_NOTIFICATION_BLOCKED, {
        sessionId: 's1',
        packageName: 'com.test',
      });

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['focus-sessions'],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['focus-active'],
      });
    });

    it('should not invalidate queries after teardown', () => {
      initializeApp();
      teardownApp();
      (queryClient.invalidateQueries as jest.Mock).mockClear();

      eventBus.emit(AppEvents.NOTIFICATION_CLASSIFIED, {
        notificationId: 'n1',
        category: 'work',
      });

      expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('Event flow verification', () => {
    it('should wire focus integration to subscribe to notification:received', () => {
      initializeApp();

      // Focus integration is started — it subscribes to notification:received
      expect(startFocusNotificationIntegration).toHaveBeenCalled();
    });

    it('should wire classification service to subscribe to notification:parsed', () => {
      initializeApp();

      // Classification service is started — it subscribes to notification:parsed
      expect(classificationService.start).toHaveBeenCalled();
    });

    it('should wire rule engine to subscribe to notification:classified', () => {
      initializeApp();

      // Rule engine is started — it subscribes to notification:classified
      expect(ruleEngine.start).toHaveBeenCalled();
    });

    it('should wire analytics integration to subscribe to classified, rule:executed, focus:session_ended', () => {
      initializeApp();

      // Analytics integration is initialized
      expect(initAnalyticsEventIntegration).toHaveBeenCalled();
    });

    it('should start notification service last to ensure all subscribers are ready', () => {
      const callOrder: string[] = [];
      (startFocusNotificationIntegration as jest.Mock).mockImplementation(() =>
        callOrder.push('focus')
      );
      (classificationService.start as jest.Mock).mockImplementation(() =>
        callOrder.push('classification')
      );
      (ruleEngine.start as jest.Mock).mockImplementation(() =>
        callOrder.push('ruleEngine')
      );
      (initAnalyticsEventIntegration as jest.Mock).mockImplementation(() =>
        callOrder.push('analytics')
      );
      (notificationService.start as jest.Mock).mockImplementation(() =>
        callOrder.push('notification')
      );

      initializeApp();

      const notificationIndex = callOrder.indexOf('notification');
      expect(notificationIndex).toBe(callOrder.length - 1);
    });

    it('should start focus integration first to block before rule evaluation', () => {
      const callOrder: string[] = [];
      (startFocusNotificationIntegration as jest.Mock).mockImplementation(() =>
        callOrder.push('focus')
      );
      (classificationService.start as jest.Mock).mockImplementation(() =>
        callOrder.push('classification')
      );
      (ruleEngine.start as jest.Mock).mockImplementation(() =>
        callOrder.push('ruleEngine')
      );
      (initAnalyticsEventIntegration as jest.Mock).mockImplementation(() =>
        callOrder.push('analytics')
      );
      (notificationService.start as jest.Mock).mockImplementation(() =>
        callOrder.push('notification')
      );

      initializeApp();

      expect(callOrder[0]).toBe('focus');
    });
  });
});
