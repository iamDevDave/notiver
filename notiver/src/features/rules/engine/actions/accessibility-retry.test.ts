import { eventBus } from '../../../../services/event-bus';
import {
  calculateBackoffDelay,
  executeWithRetry,
  setDelayFn,
  ACCESSIBILITY_ACTION_LOG_EVENT,
} from './accessibility-retry';
import type { AccessibilityActionLogEvent } from './accessibility-retry';

// Mock the event bus
jest.mock('../../../../services/event-bus', () => ({
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    clear: jest.fn(),
  },
}));

describe('calculateBackoffDelay', () => {
  it('returns 100ms for attempt 0', () => {
    expect(calculateBackoffDelay(0)).toBe(100);
  });

  it('returns 400ms for attempt 1', () => {
    expect(calculateBackoffDelay(1)).toBe(400);
  });

  it('returns 1600ms for attempt 2', () => {
    expect(calculateBackoffDelay(2)).toBe(1600);
  });
});

describe('executeWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Use instant delay for tests
    setDelayFn(async () => {});
  });

  it('succeeds on first attempt without retries', async () => {
    const actionFn = jest.fn().mockResolvedValue(true);

    const result = await executeWithRetry('dismiss', 'notif-1', 'com.example.app', actionFn);

    expect(result.success).toBe(true);
    expect(result.retryCount).toBe(0);
    expect(actionFn).toHaveBeenCalledTimes(1);
    expect(eventBus.emit).toHaveBeenCalledWith(
      ACCESSIBILITY_ACTION_LOG_EVENT,
      expect.objectContaining({
        actionType: 'dismiss',
        targetNotificationId: 'notif-1',
        packageName: 'com.example.app',
        success: true,
        retryCount: 0,
      })
    );
  });

  it('retries and succeeds on second attempt', async () => {
    const actionFn = jest.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const result = await executeWithRetry('click', 'notif-2', 'com.test.app', actionFn);

    expect(result.success).toBe(true);
    expect(result.retryCount).toBe(1);
    expect(actionFn).toHaveBeenCalledTimes(2);
  });

  it('retries and succeeds on third attempt', async () => {
    const actionFn = jest.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const result = await executeWithRetry('expand', 'notif-3', 'com.test.app', actionFn);

    expect(result.success).toBe(true);
    expect(result.retryCount).toBe(2);
    expect(actionFn).toHaveBeenCalledTimes(3);
  });

  it('fails after all retries exhausted', async () => {
    const actionFn = jest.fn().mockResolvedValue(false);

    const result = await executeWithRetry('auto_reply', 'notif-4', 'com.test.app', actionFn);

    expect(result.success).toBe(false);
    expect(result.retryCount).toBe(3);
    expect(result.error).toContain('auto_reply action returned false');
    // 1 initial + 3 retries = 4 calls
    expect(actionFn).toHaveBeenCalledTimes(4);
    expect(eventBus.emit).toHaveBeenCalledWith(
      ACCESSIBILITY_ACTION_LOG_EVENT,
      expect.objectContaining({
        actionType: 'auto_reply',
        success: false,
        retryCount: 3,
      })
    );
  });

  it('handles thrown errors and retries', async () => {
    const actionFn = jest.fn()
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce(true);

    const result = await executeWithRetry('dismiss', 'notif-5', 'com.test.app', actionFn);

    expect(result.success).toBe(true);
    expect(result.retryCount).toBe(1);
  });

  it('reports error message when all retries fail with exceptions', async () => {
    const actionFn = jest.fn().mockRejectedValue(new Error('Native module crashed'));

    const result = await executeWithRetry('expand', 'notif-6', 'com.test.app', actionFn);

    expect(result.success).toBe(false);
    expect(result.retryCount).toBe(3);
    expect(result.error).toBe('Native module crashed');
  });

  it('logs event with timestamp on success', async () => {
    const actionFn = jest.fn().mockResolvedValue(true);

    await executeWithRetry('dismiss', 'notif-7', 'com.example.app', actionFn);

    expect(eventBus.emit).toHaveBeenCalledWith(
      ACCESSIBILITY_ACTION_LOG_EVENT,
      expect.objectContaining({
        timestamp: expect.any(String),
      })
    );

    const emittedEvent = (eventBus.emit as jest.Mock).mock.calls[0][1] as AccessibilityActionLogEvent;
    // Verify timestamp is a valid ISO string
    expect(new Date(emittedEvent.timestamp).toISOString()).toBe(emittedEvent.timestamp);
  });

  it('logs event with error on failure', async () => {
    const actionFn = jest.fn().mockResolvedValue(false);

    const result = await executeWithRetry('click', 'notif-8', 'com.test.app', actionFn);

    expect(result.success).toBe(false);
    const emittedEvent = (eventBus.emit as jest.Mock).mock.calls[0][1] as AccessibilityActionLogEvent;
    expect(emittedEvent.success).toBe(false);
    expect(emittedEvent.error).toBeDefined();
  });

  it('does not include error field on success', async () => {
    const actionFn = jest.fn().mockResolvedValue(true);

    await executeWithRetry('dismiss', 'notif-9', 'com.example.app', actionFn);

    const emittedEvent = (eventBus.emit as jest.Mock).mock.calls[0][1] as AccessibilityActionLogEvent;
    expect(emittedEvent.error).toBeUndefined();
  });
});
