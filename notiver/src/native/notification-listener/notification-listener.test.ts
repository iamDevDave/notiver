/**
 * Tests for the Notification Listener Bridge.
 * Tests the mock implementation and the bridge selection logic.
 */

import { mockNotificationListenerBridge } from './mock';
import type { RawNotification } from './types';

describe('MockNotificationListenerBridge', () => {
  beforeEach(() => {
    // Reset any state between tests
    mockNotificationListenerBridge.resetMockState();
    jest.useFakeTimers();
  });

  afterEach(() => {
    mockNotificationListenerBridge.resetMockState();
    jest.useRealTimers();
  });

  describe('isRunning', () => {
    it('should return false by default', async () => {
      const result = await mockNotificationListenerBridge.isRunning();
      expect(result).toBe(false);
    });
  });

  describe('requestRestart', () => {
    it('should not throw', async () => {
      await expect(
        mockNotificationListenerBridge.requestRestart()
      ).resolves.toBeUndefined();
    });
  });

  describe('onNotificationReceived', () => {
    it('should return an unsubscribe function', () => {
      const handler = jest.fn();
      const unsubscribe = mockNotificationListenerBridge.onNotificationReceived(handler);
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should emit notifications to subscribed handlers', () => {
      const handler = jest.fn();
      const unsubscribe = mockNotificationListenerBridge.onNotificationReceived(handler);

      expect(handler).toHaveBeenCalledTimes(1);

      // Advance timer to trigger another mock emission
      jest.advanceTimersByTime(8_000);

      expect(handler).toHaveBeenCalledTimes(2);
      const notification: RawNotification = handler.mock.calls[0][0];
      expect(notification).toHaveProperty('key');
      expect(notification).toHaveProperty('packageName');
      expect(notification).toHaveProperty('appName');
      expect(notification).toHaveProperty('title');
      expect(notification).toHaveProperty('content');
      expect(notification).toHaveProperty('timestamp');
      expect(notification).toHaveProperty('priority');
      expect(notification).toHaveProperty('extras');
      expect(typeof notification.key).toBe('string');
      expect(typeof notification.packageName).toBe('string');
      expect(typeof notification.timestamp).toBe('number');

      unsubscribe();
    });

    it('should stop emitting after unsubscribe', () => {
      const handler = jest.fn();
      const unsubscribe = mockNotificationListenerBridge.onNotificationReceived(handler);

      expect(handler).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(8_000);
      expect(handler).toHaveBeenCalledTimes(2);

      unsubscribe();

      jest.advanceTimersByTime(8_000);
      // Should not receive more notifications after unsubscribe
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should support multiple handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      const unsub1 = mockNotificationListenerBridge.onNotificationReceived(handler1);
      const unsub2 = mockNotificationListenerBridge.onNotificationReceived(handler2);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(0);

      jest.advanceTimersByTime(8_000);

      expect(handler1).toHaveBeenCalledTimes(2);
      expect(handler2).toHaveBeenCalledTimes(1);

      unsub1();
      unsub2();
    });

    it('should continue emitting to remaining handlers when one unsubscribes', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      const unsub1 = mockNotificationListenerBridge.onNotificationReceived(handler1);
      const unsub2 = mockNotificationListenerBridge.onNotificationReceived(handler2);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(0);

      unsub1();

      jest.advanceTimersByTime(8_000);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      unsub2();
    });
  });

  describe('emitMockNotification', () => {
    it('should emit a custom notification to handlers', () => {
      const handler = jest.fn();
      const unsubscribe = mockNotificationListenerBridge.onNotificationReceived(handler);

      expect(handler).toHaveBeenCalledTimes(1);

      mockNotificationListenerBridge.emitMockNotification({
        key: 'test_key',
        packageName: 'com.test.app',
        appName: 'Test App',
        title: 'Test Title',
        content: 'Test Content',
      });

      expect(handler).toHaveBeenCalledTimes(2);
      const notification = handler.mock.calls[1][0];
      expect(notification.key).toBe('test_key');
      expect(notification.packageName).toBe('com.test.app');
      expect(notification.appName).toBe('Test App');
      expect(notification.title).toBe('Test Title');
      expect(notification.content).toBe('Test Content');

      unsubscribe();
    });

    it('should emit a demo notification when requested', () => {
      const handler = jest.fn();
      const unsubscribe = mockNotificationListenerBridge.onNotificationReceived(handler);

      expect(handler).toHaveBeenCalledTimes(1);

      mockNotificationListenerBridge.emitDemoNotification?.();

      expect(handler).toHaveBeenCalledTimes(2);

      unsubscribe();
    });
  });
});

describe('Bridge selection', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should export notificationListenerBridge', () => {
    // Mock react-native for the index module which imports NativeModules
    jest.mock('react-native', () => ({
      NativeModules: {},
      NativeEventEmitter: jest.fn(),
      Platform: { OS: 'android' },
    }));

    const { notificationListenerBridge } = require('./index');
    expect(notificationListenerBridge).toBeDefined();
    expect(typeof notificationListenerBridge.isRunning).toBe('function');
    expect(typeof notificationListenerBridge.requestRestart).toBe('function');
    expect(typeof notificationListenerBridge.onNotificationReceived).toBe('function');
  });

  it('should export isUsingNativeModule as false when native module is not available', () => {
    jest.mock('react-native', () => ({
      NativeModules: {},
      NativeEventEmitter: jest.fn(),
      Platform: { OS: 'android' },
    }));

    const { isUsingNativeModule } = require('./index');
    expect(isUsingNativeModule).toBe(false);
  });

  it('should use native module when available on Android', () => {
    jest.mock('react-native', () => ({
      NativeModules: {
        NotificationListenerModule: {
          isRunning: jest.fn(),
          requestRestart: jest.fn(),
        },
      },
      NativeEventEmitter: jest.fn().mockImplementation(() => ({
        addListener: jest.fn(),
      })),
      Platform: { OS: 'android' },
    }));

    const { isUsingNativeModule } = require('./index');
    expect(isUsingNativeModule).toBe(true);
  });
});
