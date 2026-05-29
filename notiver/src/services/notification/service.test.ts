import type { RawNotification } from '../../native/notification-listener/types';

// Mock the dependencies
const mockOnNotificationReceived = jest.fn();
const mockCreate = jest.fn();
const mockEmit = jest.fn();

jest.mock('../../native/notification-listener', () => ({
  notificationListenerBridge: {
    onNotificationReceived: (...args: unknown[]) => mockOnNotificationReceived(...args),
  },
}));

jest.mock('../../database/repositories', () => ({
  notificationRepository: {
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

jest.mock('../event-bus', () => ({
  eventBus: {
    emit: (...args: unknown[]) => mockEmit(...args),
  },
}));

import { notificationService } from './service';
import { AppEvents } from '../event-bus/types';

function makeRawNotification(overrides: Partial<RawNotification> = {}): RawNotification {
  return {
    key: 'test-key-123',
    packageName: 'com.example.app',
    appName: 'Example App',
    title: 'Test Title',
    content: 'Test content body',
    sender: 'John Doe',
    timestamp: 1700000000000,
    priority: 2,
    extras: { foo: 'bar' },
    ...overrides,
  };
}

describe('NotificationService', () => {
  let capturedHandler: ((raw: RawNotification) => void) | null = null;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedHandler = null;
    mockUnsubscribe = jest.fn();

    mockOnNotificationReceived.mockImplementation((handler: (raw: RawNotification) => void) => {
      capturedHandler = handler;
      return mockUnsubscribe;
    });

    mockCreate.mockResolvedValue({});

    // Ensure service is stopped before each test
    notificationService.stop();
  });

  describe('start()', () => {
    it('subscribes to the notification listener bridge', () => {
      notificationService.start();

      expect(mockOnNotificationReceived).toHaveBeenCalledTimes(1);
      expect(mockOnNotificationReceived).toHaveBeenCalledWith(expect.any(Function));
    });

    it('sets isRunning to true', () => {
      notificationService.start();

      expect(notificationService.getIsRunning()).toBe(true);
    });

    it('does not subscribe twice if already running', () => {
      notificationService.start();
      notificationService.start();

      expect(mockOnNotificationReceived).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop()', () => {
    it('calls the unsubscribe function from the bridge', () => {
      notificationService.start();
      notificationService.stop();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('sets isRunning to false', () => {
      notificationService.start();
      notificationService.stop();

      expect(notificationService.getIsRunning()).toBe(false);
    });

    it('does nothing if not running', () => {
      notificationService.stop();

      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('processNotification pipeline', () => {
    beforeEach(() => {
      notificationService.start();
    });

    afterEach(() => {
      notificationService.stop();
    });

    it('parses and persists a notification to the database', async () => {
      const raw = makeRawNotification();
      capturedHandler!(raw);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          packageName: 'com.example.app',
          appName: 'Example App',
          title: 'Test Title',
          content: 'Test content body',
          sender: 'John Doe',
          priority: 2,
          isRead: false,
          isArchived: false,
          category: null,
        })
      );
    });

    it('emits notification:received event after persisting', async () => {
      const raw = makeRawNotification();
      capturedHandler!(raw);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockEmit).toHaveBeenCalledWith(
        AppEvents.NOTIFICATION_RECEIVED,
        expect.objectContaining({
          packageName: 'com.example.app',
          appName: 'Example App',
          title: 'Test Title',
        })
      );
    });

    it('emits notification:parsed event for AI classifier', async () => {
      const raw = makeRawNotification();
      capturedHandler!(raw);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockEmit).toHaveBeenCalledWith(
        AppEvents.NOTIFICATION_PARSED,
        expect.objectContaining({
          packageName: 'com.example.app',
          appName: 'Example App',
        })
      );
    });

    it('emits both events in order', async () => {
      const raw = makeRawNotification();
      capturedHandler!(raw);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockEmit).toHaveBeenCalledTimes(2);
      expect(mockEmit.mock.calls[0][0]).toBe(AppEvents.NOTIFICATION_RECEIVED);
      expect(mockEmit.mock.calls[1][0]).toBe(AppEvents.NOTIFICATION_PARSED);
    });

    it('does not crash the pipeline when database persist fails', async () => {
      mockCreate.mockRejectedValueOnce(new Error('DB write failed'));

      const raw = makeRawNotification();
      capturedHandler!(raw);

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should not emit events since persist failed
      expect(mockEmit).not.toHaveBeenCalled();

      // Pipeline should still be running
      expect(notificationService.getIsRunning()).toBe(true);

      // Should process next notification successfully
      mockCreate.mockResolvedValueOnce({});
      capturedHandler!(makeRawNotification({ title: 'Second' }));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockEmit).toHaveBeenCalledTimes(2);
    });

    it('handles multiple notifications in sequence', async () => {
      const raw1 = makeRawNotification({ title: 'First' });
      const raw2 = makeRawNotification({ title: 'Second' });

      capturedHandler!(raw1);
      capturedHandler!(raw2);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockEmit).toHaveBeenCalledTimes(4); // 2 events per notification
    });
  });
});
