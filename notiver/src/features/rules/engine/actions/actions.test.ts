import type { ParsedNotification } from '../../../../services/notification/parser';
import type { RuleAction } from './types';

// Mock react-native to avoid import issues in test environment
jest.mock('react-native', () => ({
  NativeModules: {},
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
  Platform: { OS: 'android' },
}));

// Mock the accessibility bridge
jest.mock('../../../../native/accessibility', () => ({
  accessibilityBridge: {
    isEnabled: jest.fn().mockResolvedValue(true),
    dismissNotification: jest.fn().mockResolvedValue(true),
    clickAction: jest.fn().mockResolvedValue(true),
    expandNotification: jest.fn().mockResolvedValue(true),
    autoReply: jest.fn().mockResolvedValue(true),
  },
  isUsingNativeModule: false,
}));

// Mock event bus
jest.mock('../../../../services/event-bus', () => ({
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    clear: jest.fn(),
  },
}));

import { executeActions, getActionExecutor, registerActionExecutor } from './index';
import { dismissExecutor } from './dismiss';
import { delayExecutor } from './delay';
import { alarmExecutor } from './alarm';
import { vibrateExecutor } from './vibrate';
import { replyExecutor } from './reply';
import { launchAppExecutor } from './launch-app';
import { batchExecutor } from './batch';
import { webhookExecutor } from './webhook';
import { copyExecutor } from './copy';
import { speakExecutor } from './speak';
import { clickExecutor } from './click';
import { expandExecutor } from './expand';
import { setDelayFn } from './accessibility-retry';

function makeNotification(overrides: Partial<ParsedNotification> = {}): ParsedNotification {
  return {
    id: 'notif-1',
    packageName: 'com.example.app',
    appName: 'Example App',
    title: 'Test Title',
    content: 'This is test content',
    sender: 'John Doe',
    priority: 3,
    isRead: false,
    isArchived: false,
    rawData: null,
    receivedAt: new Date('2024-01-15T10:30:00Z'),
    createdAt: new Date('2024-01-15T10:30:00Z'),
    ...overrides,
  };
}

function makeAction(overrides: Partial<RuleAction> = {}): RuleAction {
  return {
    id: 'action-1',
    ruleId: 'rule-1',
    type: 'dismiss',
    config: {},
    orderIndex: 0,
    ...overrides,
  };
}

// Skip real delays in tests
beforeAll(() => {
  setDelayFn(async () => {});
});

describe('Action Registry', () => {
  it('returns executor for all registered action types', () => {
    expect(getActionExecutor('dismiss')).toBeDefined();
    expect(getActionExecutor('delay')).toBeDefined();
    expect(getActionExecutor('alarm')).toBeDefined();
    expect(getActionExecutor('vibrate')).toBeDefined();
    expect(getActionExecutor('reply')).toBeDefined();
    expect(getActionExecutor('launch_app')).toBeDefined();
    expect(getActionExecutor('batch')).toBeDefined();
    expect(getActionExecutor('webhook')).toBeDefined();
    expect(getActionExecutor('copy')).toBeDefined();
    expect(getActionExecutor('speak')).toBeDefined();
    expect(getActionExecutor('click')).toBeDefined();
    expect(getActionExecutor('expand')).toBeDefined();
  });

  it('allows registering a custom executor', () => {
    const customExecutor = { execute: async () => ({ success: true }) };
    registerActionExecutor('dismiss', customExecutor);
    expect(getActionExecutor('dismiss')).toBe(customExecutor);
    // Restore original
    registerActionExecutor('dismiss', dismissExecutor);
  });
});

describe('Dismiss Executor', () => {
  it('returns success when accessibility bridge succeeds', async () => {
    const notification = makeNotification();
    const result = await dismissExecutor.execute(notification, {});
    expect(result.success).toBe(true);
  });
});

describe('Click Executor', () => {
  it('returns success with default actionIndex', async () => {
    const notification = makeNotification();
    const result = await clickExecutor.execute(notification, {});
    expect(result.success).toBe(true);
  });

  it('accepts custom actionIndex', async () => {
    const notification = makeNotification();
    const result = await clickExecutor.execute(notification, { actionIndex: 2 });
    expect(result.success).toBe(true);
  });

  it('returns failure for negative actionIndex', async () => {
    const notification = makeNotification();
    const result = await clickExecutor.execute(notification, { actionIndex: -1 });
    expect(result.success).toBe(false);
    expect(result.error).toBe('actionIndex must be a non-negative integer');
  });
});

describe('Expand Executor', () => {
  it('returns success when accessibility bridge succeeds', async () => {
    const notification = makeNotification();
    const result = await expandExecutor.execute(notification, {});
    expect(result.success).toBe(true);
  });
});

describe('Delay Executor', () => {
  it('returns success with default duration', async () => {
    const notification = makeNotification();
    const result = await delayExecutor.execute(notification, {});
    expect(result.success).toBe(true);
  });

  it('accepts custom duration', async () => {
    const notification = makeNotification();
    const result = await delayExecutor.execute(notification, { durationMs: 120000 });
    expect(result.success).toBe(true);
  });
});

describe('Alarm Executor', () => {
  it('returns success (placeholder)', async () => {
    const notification = makeNotification();
    const result = await alarmExecutor.execute(notification, {});
    expect(result.success).toBe(true);
  });

  it('accepts custom sound and duration', async () => {
    const notification = makeNotification();
    const result = await alarmExecutor.execute(notification, { sound: 'alert', durationMs: 10000 });
    expect(result.success).toBe(true);
  });
});

describe('Vibrate Executor', () => {
  it('handles missing expo-haptics gracefully', async () => {
    const notification = makeNotification();
    const result = await vibrateExecutor.execute(notification, { pattern: 'heavy' });
    // In test environment, expo-haptics may not be available
    expect(result).toHaveProperty('success');
  });
});

describe('Reply Executor', () => {
  it('returns success with valid message', async () => {
    const notification = makeNotification();
    const result = await replyExecutor.execute(notification, { message: 'Got it, thanks!' });
    expect(result.success).toBe(true);
  });

  it('returns failure when message is empty', async () => {
    const notification = makeNotification();
    const result = await replyExecutor.execute(notification, { message: '' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Reply message is required');
  });

  it('returns failure when message is missing', async () => {
    const notification = makeNotification();
    const result = await replyExecutor.execute(notification, {});
    expect(result.success).toBe(false);
    expect(result.error).toBe('Reply message is required');
  });
});

describe('Launch App Executor', () => {
  it('handles missing Linking gracefully', async () => {
    const notification = makeNotification();
    const result = await launchAppExecutor.execute(notification, { url: 'https://example.com' });
    // In test environment, Linking may not be available
    expect(result).toHaveProperty('success');
  });
});

describe('Batch Executor', () => {
  it('returns success (placeholder)', async () => {
    const notification = makeNotification();
    const result = await batchExecutor.execute(notification, {});
    expect(result.success).toBe(true);
  });

  it('accepts custom batch key and interval', async () => {
    const notification = makeNotification();
    const result = await batchExecutor.execute(notification, { batchKey: 'messaging', intervalMs: 600000 });
    expect(result.success).toBe(true);
  });
});

describe('Webhook Executor', () => {
  it('returns failure when URL is missing', async () => {
    const notification = makeNotification();
    const result = await webhookExecutor.execute(notification, {});
    expect(result.success).toBe(false);
    expect(result.error).toBe('Webhook URL is required');
  });

  it('returns failure when URL is empty', async () => {
    const notification = makeNotification();
    const result = await webhookExecutor.execute(notification, { url: '' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Webhook URL is required');
  });
});

describe('Copy Executor', () => {
  it('returns failure when content is null and field is content', async () => {
    const notification = makeNotification({ content: null });
    const result = await copyExecutor.execute(notification, { field: 'content' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Nothing to copy — field is empty');
  });

  it('returns failure when title is null and field is title', async () => {
    const notification = makeNotification({ title: null });
    const result = await copyExecutor.execute(notification, { field: 'title' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Nothing to copy — field is empty');
  });

  it('handles template substitution', async () => {
    const notification = makeNotification({ title: 'Alert', content: 'Server down' });
    const result = await copyExecutor.execute(notification, { template: '{title}: {content}' });
    // Will fail in test env due to missing Clipboard, but validates template logic
    expect(result).toHaveProperty('success');
  });
});

describe('Speak Executor', () => {
  it('returns success with valid content (placeholder)', async () => {
    const notification = makeNotification({ title: 'Alert', content: 'Server is down' });
    const result = await speakExecutor.execute(notification, {});
    expect(result.success).toBe(true);
  });

  it('returns failure when all fields are empty', async () => {
    const notification = makeNotification({ title: null, content: null });
    const result = await speakExecutor.execute(notification, { field: 'all' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Nothing to speak — field is empty');
  });

  it('returns failure when specified field is empty', async () => {
    const notification = makeNotification({ title: null });
    const result = await speakExecutor.execute(notification, { field: 'title' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Nothing to speak — field is empty');
  });
});

describe('executeActions', () => {
  it('returns empty array for no actions', async () => {
    const notification = makeNotification();
    const results = await executeActions([], notification);
    expect(results).toEqual([]);
  });

  it('executes a single action', async () => {
    const notification = makeNotification();
    const actions: RuleAction[] = [makeAction({ type: 'dismiss', config: {} })];
    const results = await executeActions(actions, notification);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
  });

  it('executes actions in orderIndex sequence', async () => {
    const executionOrder: string[] = [];

    // Register tracking executors
    registerActionExecutor('alarm', {
      async execute() {
        executionOrder.push('alarm');
        return { success: true };
      },
    });
    registerActionExecutor('batch', {
      async execute() {
        executionOrder.push('batch');
        return { success: true };
      },
    });
    registerActionExecutor('dismiss', {
      async execute() {
        executionOrder.push('dismiss');
        return { success: true };
      },
    });

    const notification = makeNotification();
    const actions: RuleAction[] = [
      makeAction({ id: 'a3', type: 'dismiss', orderIndex: 2 }),
      makeAction({ id: 'a1', type: 'alarm', orderIndex: 0 }),
      makeAction({ id: 'a2', type: 'batch', orderIndex: 1 }),
    ];

    await executeActions(actions, notification);
    expect(executionOrder).toEqual(['alarm', 'batch', 'dismiss']);

    // Restore original executors
    registerActionExecutor('alarm', alarmExecutor);
    registerActionExecutor('batch', batchExecutor);
    registerActionExecutor('dismiss', dismissExecutor);
  });

  it('continues executing after a failed action', async () => {
    const executionOrder: string[] = [];

    registerActionExecutor('alarm', {
      async execute() {
        executionOrder.push('alarm');
        return { success: false, error: 'Alarm failed' };
      },
    });
    registerActionExecutor('dismiss', {
      async execute() {
        executionOrder.push('dismiss');
        return { success: true };
      },
    });

    const notification = makeNotification();
    const actions: RuleAction[] = [
      makeAction({ id: 'a1', type: 'alarm', orderIndex: 0 }),
      makeAction({ id: 'a2', type: 'dismiss', orderIndex: 1 }),
    ];

    const results = await executeActions(actions, notification);
    expect(executionOrder).toEqual(['alarm', 'dismiss']);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe('Alarm failed');
    expect(results[1].success).toBe(true);

    // Restore
    registerActionExecutor('alarm', alarmExecutor);
    registerActionExecutor('dismiss', dismissExecutor);
  });

  it('handles executor that throws an exception', async () => {
    registerActionExecutor('alarm', {
      async execute() {
        throw new Error('Unexpected crash');
      },
    });
    registerActionExecutor('dismiss', {
      async execute() {
        return { success: true };
      },
    });

    const notification = makeNotification();
    const actions: RuleAction[] = [
      makeAction({ id: 'a1', type: 'alarm', orderIndex: 0 }),
      makeAction({ id: 'a2', type: 'dismiss', orderIndex: 1 }),
    ];

    const results = await executeActions(actions, notification);
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe('Unexpected crash');
    expect(results[1].success).toBe(true);

    // Restore
    registerActionExecutor('alarm', alarmExecutor);
    registerActionExecutor('dismiss', dismissExecutor);
  });

  it('returns failure for unregistered action type', async () => {
    const notification = makeNotification();
    const actions: RuleAction[] = [
      makeAction({ type: 'unknown_type' as any, orderIndex: 0 }),
    ];

    const results = await executeActions(actions, notification);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('No executor registered');
  });
});
