/**
 * Tests for Focus Engine ↔ Notification Pipeline Integration.
 *
 * Validates that:
 * - Notifications from blocked apps are suppressed during active focus sessions
 * - blockedCount is incremented when a notification is blocked
 * - interruptionCount is incremented for non-blocked notifications during focus
 * - "focus:notification_blocked" event is emitted for analytics
 * - No action is taken when no focus session is active
 */

import type { ParsedNotification } from '../../../services/notification/parser';

// Mock the focus engine
const mockIsBlocked = jest.fn();
const mockGetCurrentSession = jest.fn();
const mockIncrementBlockedCount = jest.fn();
const mockIncrementInterruptionCount = jest.fn();

jest.mock('./engine', () => ({
  focusEngine: {
    isBlocked: (...args: unknown[]) => mockIsBlocked(...args),
    getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
    incrementBlockedCount: (...args: unknown[]) => mockIncrementBlockedCount(...args),
    incrementInterruptionCount: (...args: unknown[]) => mockIncrementInterruptionCount(...args),
  },
}));

// Mock the event bus with a real-ish implementation for subscribe/emit testing
type Handler = (payload: unknown) => void;
const handlers: Map<string, Set<Handler>> = new Map();

const mockEmit = jest.fn((event: string, payload: unknown) => {
  const eventHandlers = handlers.get(event);
  if (eventHandlers) {
    eventHandlers.forEach((handler) => handler(payload));
  }
});

const mockOn = jest.fn((event: string, handler: Handler) => {
  if (!handlers.has(event)) {
    handlers.set(event, new Set());
  }
  handlers.get(event)!.add(handler);
  return () => {
    handlers.get(event)?.delete(handler);
  };
});

jest.mock('../../../services/event-bus', () => ({
  eventBus: {
    emit: (...args: unknown[]) => mockEmit(args[0] as string, args[1]),
    on: (...args: unknown[]) => mockOn(args[0] as string, args[1] as Handler),
  },
  AppEvents: {
    NOTIFICATION_RECEIVED: 'notification:received',
    FOCUS_NOTIFICATION_BLOCKED: 'focus:notification_blocked',
  },
}));

import {
  startFocusNotificationIntegration,
  stopFocusNotificationIntegration,
} from './focus-notification-integration';

function makeNotification(overrides: Partial<ParsedNotification> = {}): ParsedNotification {
  return {
    id: 'notif-1',
    packageName: 'com.social.app',
    appName: 'Social App',
    title: 'New message',
    content: 'Hello world',
    sender: 'John',
    priority: 0,
    isRead: false,
    isArchived: false,
    rawData: null,
    receivedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

function makeSession(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'session-1',
    preset: 'work',
    status: 'active',
    startedAt: new Date(),
    endedAt: null,
    plannedDurationMin: 60,
    actualDurationMin: null,
    blockedCount: 2,
    interruptionCount: 1,
    blockedApps: ['com.social.app', 'com.game.app'],
    allowedApps: ['com.phone.app'],
    ...overrides,
  };
}

describe('FocusNotificationIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    handlers.clear();
    mockIncrementBlockedCount.mockResolvedValue(undefined);
    mockIncrementInterruptionCount.mockResolvedValue(undefined);
    // Stop any previous integration
    stopFocusNotificationIntegration();
  });

  afterEach(() => {
    stopFocusNotificationIntegration();
  });

  describe('startFocusNotificationIntegration()', () => {
    it('subscribes to notification:received event', () => {
      startFocusNotificationIntegration();

      expect(mockOn).toHaveBeenCalledWith('notification:received', expect.any(Function));
    });

    it('does not subscribe twice if called multiple times', () => {
      startFocusNotificationIntegration();
      startFocusNotificationIntegration();

      expect(mockOn).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopFocusNotificationIntegration()', () => {
    it('unsubscribes from the event bus', () => {
      startFocusNotificationIntegration();
      stopFocusNotificationIntegration();

      // Verify the handler was removed (no longer in handlers map)
      expect(handlers.get('notification:received')?.size ?? 0).toBe(0);
    });
  });

  describe('notification blocking', () => {
    beforeEach(() => {
      startFocusNotificationIntegration();
    });

    it('does nothing when no focus session is active', async () => {
      mockGetCurrentSession.mockReturnValue(null);

      const notification = makeNotification();
      // Simulate the event
      const handler = mockOn.mock.calls[0][1] as Handler;
      handler(notification);

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockIsBlocked).not.toHaveBeenCalled();
      expect(mockIncrementBlockedCount).not.toHaveBeenCalled();
      expect(mockIncrementInterruptionCount).not.toHaveBeenCalled();
    });

    it('does nothing when session is paused', async () => {
      mockGetCurrentSession.mockReturnValue(makeSession({ status: 'paused' }));

      const notification = makeNotification();
      const handler = mockOn.mock.calls[0][1] as Handler;
      handler(notification);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockIsBlocked).not.toHaveBeenCalled();
      expect(mockIncrementBlockedCount).not.toHaveBeenCalled();
      expect(mockIncrementInterruptionCount).not.toHaveBeenCalled();
    });

    it('blocks notification from a blocked app and increments blockedCount', async () => {
      const session = makeSession({ status: 'active' });
      mockGetCurrentSession.mockReturnValue(session);
      mockIsBlocked.mockReturnValue(true);

      const notification = makeNotification({ packageName: 'com.social.app' });
      const handler = mockOn.mock.calls[0][1] as Handler;
      handler(notification);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockIsBlocked).toHaveBeenCalledWith('com.social.app');
      expect(mockIncrementBlockedCount).toHaveBeenCalledWith('session-1');
      expect(mockIncrementInterruptionCount).not.toHaveBeenCalled();
    });

    it('emits focus:notification_blocked event when notification is blocked', async () => {
      const session = makeSession({ status: 'active', blockedCount: 5 });
      mockGetCurrentSession.mockReturnValue(session);
      mockIsBlocked.mockReturnValue(true);

      const notification = makeNotification({
        packageName: 'com.game.app',
        appName: 'Game App',
      });
      const handler = mockOn.mock.calls[0][1] as Handler;
      handler(notification);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockEmit).toHaveBeenCalledWith('focus:notification_blocked', {
        sessionId: 'session-1',
        packageName: 'com.game.app',
        appName: 'Game App',
        blockedCount: 6, // previous 5 + 1
        timestamp: expect.any(Date),
      });
    });

    it('increments interruptionCount for non-blocked notifications during active session', async () => {
      const session = makeSession({ status: 'active' });
      mockGetCurrentSession.mockReturnValue(session);
      mockIsBlocked.mockReturnValue(false);

      const notification = makeNotification({ packageName: 'com.other.app' });
      const handler = mockOn.mock.calls[0][1] as Handler;
      handler(notification);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockIsBlocked).toHaveBeenCalledWith('com.other.app');
      expect(mockIncrementInterruptionCount).toHaveBeenCalledWith('session-1');
      expect(mockIncrementBlockedCount).not.toHaveBeenCalled();
    });

    it('does not emit focus:notification_blocked for non-blocked notifications', async () => {
      const session = makeSession({ status: 'active' });
      mockGetCurrentSession.mockReturnValue(session);
      mockIsBlocked.mockReturnValue(false);

      const notification = makeNotification({ packageName: 'com.other.app' });
      const handler = mockOn.mock.calls[0][1] as Handler;
      handler(notification);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockEmit).not.toHaveBeenCalledWith(
        'focus:notification_blocked',
        expect.anything()
      );
    });

    it('handles errors gracefully without crashing', async () => {
      const session = makeSession({ status: 'active' });
      mockGetCurrentSession.mockReturnValue(session);
      mockIsBlocked.mockReturnValue(true);
      mockIncrementBlockedCount.mockRejectedValue(new Error('DB error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const notification = makeNotification();
      const handler = mockOn.mock.calls[0][1] as Handler;
      handler(notification);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        '[FocusNotificationIntegration] Error handling notification:',
        'DB error'
      );

      consoleSpy.mockRestore();
    });
  });
});
