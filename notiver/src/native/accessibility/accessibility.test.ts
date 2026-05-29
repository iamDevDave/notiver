/**
 * Tests for the Accessibility Service Bridge.
 * Tests the mock implementation and the bridge selection logic.
 */

import { mockAccessibilityBridge } from './mock';

describe('MockAccessibilityBridge', () => {
  beforeEach(() => {
    mockAccessibilityBridge.reset();
  });

  describe('isEnabled', () => {
    it('should return false by default', async () => {
      const result = await mockAccessibilityBridge.isEnabled();
      expect(result).toBe(false);
    });

    it('should return true when set to enabled', async () => {
      mockAccessibilityBridge.setEnabled(true);
      const result = await mockAccessibilityBridge.isEnabled();
      expect(result).toBe(true);
    });
  });

  describe('dismissNotification', () => {
    it('should return true on success', async () => {
      const result = await mockAccessibilityBridge.dismissNotification(
        'com.whatsapp',
        'notif_123'
      );
      expect(result).toBe(true);
    });

    it('should return false when configured to fail', async () => {
      mockAccessibilityBridge.setShouldFail(true);
      const result = await mockAccessibilityBridge.dismissNotification(
        'com.whatsapp',
        'notif_123'
      );
      expect(result).toBe(false);
    });

    it('should log the action', async () => {
      await mockAccessibilityBridge.dismissNotification(
        'com.whatsapp',
        'notif_123'
      );
      const log = mockAccessibilityBridge.getActionLog();
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({
        action: 'dismiss',
        packageName: 'com.whatsapp',
        notificationId: 'notif_123',
      });
      expect(log[0].timestamp).toBeGreaterThan(0);
    });
  });

  describe('clickAction', () => {
    it('should return true on success', async () => {
      const result = await mockAccessibilityBridge.clickAction(
        'com.whatsapp',
        0
      );
      expect(result).toBe(true);
    });

    it('should return false when configured to fail', async () => {
      mockAccessibilityBridge.setShouldFail(true);
      const result = await mockAccessibilityBridge.clickAction(
        'com.whatsapp',
        1
      );
      expect(result).toBe(false);
    });

    it('should log the action with actionIndex', async () => {
      await mockAccessibilityBridge.clickAction('com.slack', 2);
      const log = mockAccessibilityBridge.getActionLog();
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({
        action: 'click',
        packageName: 'com.slack',
        notificationId: '',
      });
      expect(log[0].extra).toEqual({ actionIndex: 2 });
    });
  });

  describe('expandNotification', () => {
    it('should return true on success', async () => {
      const result = await mockAccessibilityBridge.expandNotification(
        'com.google.android.gm',
        'notif_456'
      );
      expect(result).toBe(true);
    });

    it('should return false when configured to fail', async () => {
      mockAccessibilityBridge.setShouldFail(true);
      const result = await mockAccessibilityBridge.expandNotification(
        'com.google.android.gm',
        'notif_456'
      );
      expect(result).toBe(false);
    });

    it('should log the action', async () => {
      await mockAccessibilityBridge.expandNotification(
        'com.google.android.gm',
        'notif_456'
      );
      const log = mockAccessibilityBridge.getActionLog();
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({
        action: 'expand',
        packageName: 'com.google.android.gm',
        notificationId: 'notif_456',
      });
    });
  });

  describe('autoReply', () => {
    it('should return true on success', async () => {
      const result = await mockAccessibilityBridge.autoReply(
        'com.whatsapp',
        'notif_789',
        'Hello, I am busy right now!'
      );
      expect(result).toBe(true);
    });

    it('should return false when configured to fail', async () => {
      mockAccessibilityBridge.setShouldFail(true);
      const result = await mockAccessibilityBridge.autoReply(
        'com.whatsapp',
        'notif_789',
        'Hello!'
      );
      expect(result).toBe(false);
    });

    it('should log the action with message', async () => {
      await mockAccessibilityBridge.autoReply(
        'com.whatsapp',
        'notif_789',
        'On my way!'
      );
      const log = mockAccessibilityBridge.getActionLog();
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({
        action: 'auto_reply',
        packageName: 'com.whatsapp',
        notificationId: 'notif_789',
      });
      expect(log[0].extra).toEqual({ message: 'On my way!' });
    });
  });

  describe('action log', () => {
    it('should accumulate multiple actions', async () => {
      await mockAccessibilityBridge.dismissNotification('com.app1', 'n1');
      await mockAccessibilityBridge.expandNotification('com.app2', 'n2');
      await mockAccessibilityBridge.autoReply('com.app3', 'n3', 'Hi');

      const log = mockAccessibilityBridge.getActionLog();
      expect(log).toHaveLength(3);
      expect(log[0].action).toBe('dismiss');
      expect(log[1].action).toBe('expand');
      expect(log[2].action).toBe('auto_reply');
    });

    it('should clear the action log', async () => {
      await mockAccessibilityBridge.dismissNotification('com.app1', 'n1');
      expect(mockAccessibilityBridge.getActionLog()).toHaveLength(1);

      mockAccessibilityBridge.clearActionLog();
      expect(mockAccessibilityBridge.getActionLog()).toHaveLength(0);
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      mockAccessibilityBridge.setEnabled(true);
      mockAccessibilityBridge.setShouldFail(true);
      await mockAccessibilityBridge.dismissNotification('com.app', 'n1');

      mockAccessibilityBridge.reset();

      expect(await mockAccessibilityBridge.isEnabled()).toBe(false);
      expect(
        await mockAccessibilityBridge.dismissNotification('com.app', 'n2')
      ).toBe(true);
      expect(mockAccessibilityBridge.getActionLog()).toHaveLength(1); // only the new one
    });
  });
});

describe('Bridge selection', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should export accessibilityBridge', () => {
    jest.mock('react-native', () => ({
      NativeModules: {},
      NativeEventEmitter: jest.fn(),
      Platform: { OS: 'android' },
    }));

    const { accessibilityBridge } = require('./index');
    expect(accessibilityBridge).toBeDefined();
    expect(typeof accessibilityBridge.isEnabled).toBe('function');
    expect(typeof accessibilityBridge.dismissNotification).toBe('function');
    expect(typeof accessibilityBridge.clickAction).toBe('function');
    expect(typeof accessibilityBridge.expandNotification).toBe('function');
    expect(typeof accessibilityBridge.autoReply).toBe('function');
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
        AccessibilityModule: {
          isEnabled: jest.fn(),
          dismissNotification: jest.fn(),
          clickAction: jest.fn(),
          expandNotification: jest.fn(),
          autoReply: jest.fn(),
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

  it('should not use native module on non-Android platforms', () => {
    jest.mock('react-native', () => ({
      NativeModules: {
        AccessibilityModule: {
          isEnabled: jest.fn(),
        },
      },
      NativeEventEmitter: jest.fn(),
      Platform: { OS: 'ios' },
    }));

    const { isUsingNativeModule } = require('./index');
    expect(isUsingNativeModule).toBe(false);
  });
});
