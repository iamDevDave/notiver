/**
 * Tests for Analytics Event Bus Integration.
 * Verifies that event subscriptions trigger incremental updates
 * and invalidate TanStack Query cache.
 *
 * Validates: Requirement 12.5
 */

import { eventBus, AppEvents } from '@/src/services/event-bus';
import {
  initAnalyticsEventIntegration,
  disposeAnalyticsEventIntegration,
} from './analytics-event-integration';

// Mock the analytics service
jest.mock('./index', () => ({
  analyticsService: {
    incrementalUpdate: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock the query client
jest.mock('@/src/providers/query-provider', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

import { analyticsService } from './index';
import { queryClient } from '@/src/providers/query-provider';

describe('Analytics Event Bus Integration', () => {
  beforeEach(() => {
    eventBus.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    disposeAnalyticsEventIntegration();
  });

  describe('initAnalyticsEventIntegration', () => {
    it('should subscribe to notification:classified, rule:executed, and focus:session_ended events', () => {
      initAnalyticsEventIntegration();

      expect(eventBus.listenerCount(AppEvents.NOTIFICATION_CLASSIFIED)).toBe(1);
      expect(eventBus.listenerCount(AppEvents.RULE_EXECUTED)).toBe(1);
      expect(eventBus.listenerCount(AppEvents.FOCUS_SESSION_ENDED)).toBe(1);
    });

    it('should be idempotent — calling init twice does not double-subscribe', () => {
      initAnalyticsEventIntegration();
      initAnalyticsEventIntegration();

      expect(eventBus.listenerCount(AppEvents.NOTIFICATION_CLASSIFIED)).toBe(1);
      expect(eventBus.listenerCount(AppEvents.RULE_EXECUTED)).toBe(1);
      expect(eventBus.listenerCount(AppEvents.FOCUS_SESSION_ENDED)).toBe(1);
    });

    it('should return a cleanup function', () => {
      const cleanup = initAnalyticsEventIntegration();
      expect(typeof cleanup).toBe('function');
    });
  });

  describe('disposeAnalyticsEventIntegration', () => {
    it('should unsubscribe all event listeners', () => {
      initAnalyticsEventIntegration();
      disposeAnalyticsEventIntegration();

      expect(eventBus.listenerCount(AppEvents.NOTIFICATION_CLASSIFIED)).toBe(0);
      expect(eventBus.listenerCount(AppEvents.RULE_EXECUTED)).toBe(0);
      expect(eventBus.listenerCount(AppEvents.FOCUS_SESSION_ENDED)).toBe(0);
    });

    it('should not throw when called without prior init', () => {
      expect(() => disposeAnalyticsEventIntegration()).not.toThrow();
    });
  });

  describe('notification:classified handler', () => {
    it('should call incrementalUpdate with notification_received event', async () => {
      initAnalyticsEventIntegration();

      eventBus.emit(AppEvents.NOTIFICATION_CLASSIFIED, {
        id: 'notif-1',
        packageName: 'com.example.app',
        appName: 'Example App',
        category: 'work',
      });

      // Allow async handler to complete
      await flushPromises();

      expect(analyticsService.incrementalUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notification_received',
          timestamp: expect.any(Date),
          data: {
            packageName: 'com.example.app',
            appName: 'Example App',
            category: 'work',
          },
        })
      );
    });

    it('should invalidate analytics and dashboard query caches', async () => {
      initAnalyticsEventIntegration();

      eventBus.emit(AppEvents.NOTIFICATION_CLASSIFIED, {
        id: 'notif-1',
        packageName: 'com.example.app',
        appName: 'Example App',
        category: 'social',
      });

      await flushPromises();

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['analytics'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });

    it('should emit ANALYTICS_UPDATED event after successful update', async () => {
      initAnalyticsEventIntegration();
      const handler = jest.fn();
      eventBus.on(AppEvents.ANALYTICS_UPDATED, handler);

      eventBus.emit(AppEvents.NOTIFICATION_CLASSIFIED, {
        id: 'notif-1',
        packageName: 'com.example.app',
        appName: 'Example App',
      });

      await flushPromises();

      expect(handler).toHaveBeenCalledWith({ source: 'notification_classified' });
    });

    it('should not throw when incrementalUpdate fails', async () => {
      (analyticsService.incrementalUpdate as jest.Mock).mockRejectedValueOnce(
        new Error('DB error')
      );
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      initAnalyticsEventIntegration();

      eventBus.emit(AppEvents.NOTIFICATION_CLASSIFIED, {
        id: 'notif-1',
        packageName: 'com.example.app',
        appName: 'Example App',
      });

      await flushPromises();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AnalyticsIntegration] Failed to update on notification:classified:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('rule:executed handler', () => {
    it('should call incrementalUpdate with rule_executed event', async () => {
      initAnalyticsEventIntegration();

      eventBus.emit(AppEvents.RULE_EXECUTED, {
        ruleId: 'rule-1',
        notificationId: 'notif-1',
        status: 'success',
      });

      await flushPromises();

      expect(analyticsService.incrementalUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rule_executed',
          timestamp: expect.any(Date),
          data: {
            ruleId: 'rule-1',
          },
        })
      );
    });

    it('should invalidate analytics and dashboard query caches', async () => {
      initAnalyticsEventIntegration();

      eventBus.emit(AppEvents.RULE_EXECUTED, {
        ruleId: 'rule-1',
        notificationId: 'notif-1',
        status: 'success',
      });

      await flushPromises();

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['analytics'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });

    it('should emit ANALYTICS_UPDATED event after successful update', async () => {
      initAnalyticsEventIntegration();
      const handler = jest.fn();
      eventBus.on(AppEvents.ANALYTICS_UPDATED, handler);

      eventBus.emit(AppEvents.RULE_EXECUTED, {
        ruleId: 'rule-1',
        notificationId: 'notif-1',
        status: 'success',
      });

      await flushPromises();

      expect(handler).toHaveBeenCalledWith({ source: 'rule_executed' });
    });
  });

  describe('focus:session_ended handler', () => {
    it('should call incrementalUpdate with focus_session_ended event', async () => {
      initAnalyticsEventIntegration();

      eventBus.emit(AppEvents.FOCUS_SESSION_ENDED, {
        sessionId: 'session-1',
        actualDurationMin: 45,
        blockedCount: 12,
      });

      await flushPromises();

      expect(analyticsService.incrementalUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'focus_session_ended',
          timestamp: expect.any(Date),
          data: {
            focusMinutes: 45,
            blockedCount: 12,
          },
        })
      );
    });

    it('should invalidate analytics and dashboard query caches', async () => {
      initAnalyticsEventIntegration();

      eventBus.emit(AppEvents.FOCUS_SESSION_ENDED, {
        sessionId: 'session-1',
        actualDurationMin: 30,
        blockedCount: 5,
      });

      await flushPromises();

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['analytics'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });

    it('should emit ANALYTICS_UPDATED event after successful update', async () => {
      initAnalyticsEventIntegration();
      const handler = jest.fn();
      eventBus.on(AppEvents.ANALYTICS_UPDATED, handler);

      eventBus.emit(AppEvents.FOCUS_SESSION_ENDED, {
        sessionId: 'session-1',
        actualDurationMin: 60,
        blockedCount: 8,
      });

      await flushPromises();

      expect(handler).toHaveBeenCalledWith({ source: 'focus_session_ended' });
    });

    it('should not throw when incrementalUpdate fails', async () => {
      (analyticsService.incrementalUpdate as jest.Mock).mockRejectedValueOnce(
        new Error('DB error')
      );
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      initAnalyticsEventIntegration();

      eventBus.emit(AppEvents.FOCUS_SESSION_ENDED, {
        sessionId: 'session-1',
        actualDurationMin: 30,
        blockedCount: 3,
      });

      await flushPromises();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AnalyticsIntegration] Failed to update on focus:session_ended:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});

/**
 * Helper to flush all pending promises in the microtask queue.
 */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
