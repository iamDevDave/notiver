import type { ParsedNotification } from '../../../services/notification/parser';

// Mock the database module
const mockSelectFrom = jest.fn<(table: unknown) => Promise<unknown[]>>();
jest.mock('../../../database/index', () => ({
  db: {
    select: jest.fn(() => ({
      from: (table: unknown) => mockSelectFrom(table),
    })),
  },
}));

// Mock the repositories
const mockFindActive = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockCreateExecution = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('../../../database/repositories', () => ({
  ruleRepository: {
    findActive: (...args: unknown[]) => mockFindActive(...args),
  },
  ruleExecutionRepository: {
    create: (...args: unknown[]) => mockCreateExecution(...args),
  },
}));

// Mock the event bus
const mockEmit = jest.fn<(...args: unknown[]) => void>();
const mockOn = jest.fn<(...args: unknown[]) => void>();
const mockUnsubscribe = jest.fn<() => void>();

jest.mock('../../../services/event-bus', () => ({
  eventBus: {
    emit: (...args: unknown[]) => mockEmit(...args),
    on: (...args: unknown[]) => {
      mockOn(...args);
      return mockUnsubscribe;
    },
  },
  AppEvents: {
    NOTIFICATION_CLASSIFIED: 'notification:classified',
    RULE_EXECUTED: 'rule:executed',
    RULE_UPDATED: 'rule:updated',
  },
}));

// Mock the performance module
jest.mock('../../../services/performance', () => ({
  logRuleEvalMetrics: jest.fn(),
}));

jest.mock('../../../database/schema', () => ({
  ruleConditions: { __table: 'rule_conditions' },
  ruleActions: { __table: 'rule_actions' },
}));

// Mock triggers
const mockTriggerEvaluate = jest.fn<(...args: unknown[]) => boolean>();
const mockGetTriggerHandler = jest.fn<(...args: unknown[]) => unknown>();
jest.mock('./triggers', () => ({
  getTriggerHandler: (...args: unknown[]) => mockGetTriggerHandler(...args),
}));

// Mock conditions
const mockEvaluateConditions = jest.fn<(...args: unknown[]) => boolean>();
jest.mock('./conditions', () => ({
  evaluateConditions: (...args: unknown[]) => mockEvaluateConditions(...args),
}));

// Mock actions
const mockExecuteActions = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
jest.mock('./actions', () => ({
  executeActions: (...args: unknown[]) => mockExecuteActions(...args),
}));

import { ruleEngine } from './engine';

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

function makeRule(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'rule-1',
    name: 'Test Rule',
    description: null,
    triggerType: 'keyword',
    triggerConfig: JSON.stringify({ keywords: ['urgent'] }),
    isActive: true,
    priority: 0,
    executionCount: 0,
    lastTriggeredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('RuleEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Invalidate the rule cache before each test
    (ruleEngine as any).ruleCache = null;
    (ruleEngine as any).ruleCacheTimestamp = 0;

    // Default: batch-load returns empty arrays for conditions and actions
    mockSelectFrom.mockImplementation((_table: unknown) => {
      return Promise.resolve([]);
    });

    // Default: no active rules
    mockFindActive.mockResolvedValue([]);
    mockCreateExecution.mockResolvedValue({ id: 'exec-1' });

    // Default: trigger handler returns a handler that evaluates to false
    mockTriggerEvaluate.mockReturnValue(false);
    mockGetTriggerHandler.mockReturnValue({
      evaluate: (...args: unknown[]) => mockTriggerEvaluate(...args),
    });
  });

  describe('start()', () => {
    it('subscribes to notification:classified event', () => {
      ruleEngine.start();
      expect(mockOn).toHaveBeenCalledWith(
        'notification:classified',
        expect.any(Function)
      );
      ruleEngine.stop();
    });

    it('does not subscribe twice if already started', () => {
      ruleEngine.start();
      ruleEngine.start();
      // First call is for notification:classified, second for rule:updated
      expect(mockOn).toHaveBeenCalledTimes(2);
      ruleEngine.stop();
    });
  });

  describe('stop()', () => {
    it('calls the unsubscribe function', () => {
      ruleEngine.start();
      ruleEngine.stop();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('does nothing if not started', () => {
      ruleEngine.stop();
      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('evaluate()', () => {
    it('returns empty results when no active rules exist', async () => {
      mockFindActive.mockResolvedValue([]);
      const notification = makeNotification();

      const results = await ruleEngine.evaluate(notification);

      expect(results).toEqual([]);
    });

    it('skips rules whose trigger does not match', async () => {
      mockFindActive.mockResolvedValue([makeRule()]);
      mockTriggerEvaluate.mockReturnValue(false);

      const notification = makeNotification();
      const results = await ruleEngine.evaluate(notification);

      expect(results).toEqual([]);
      expect(mockExecuteActions).not.toHaveBeenCalled();
    });

    it('skips rules whose conditions do not pass', async () => {
      mockFindActive.mockResolvedValue([makeRule()]);
      mockTriggerEvaluate.mockReturnValue(true);
      mockEvaluateConditions.mockReturnValue(false);

      const notification = makeNotification();
      const results = await ruleEngine.evaluate(notification);

      expect(results).toEqual([]);
      expect(mockExecuteActions).not.toHaveBeenCalled();
    });

    it('executes actions when trigger and conditions match', async () => {
      const rule = makeRule();
      mockFindActive.mockResolvedValue([rule]);
      mockTriggerEvaluate.mockReturnValue(true);
      mockEvaluateConditions.mockReturnValue(true);

      // Batch-load: conditions table returns empty, actions table returns one action
      mockSelectFrom.mockImplementation((table: any) => {
        if (table?.__table === 'rule_actions') {
          return Promise.resolve([
            { id: 'action-1', ruleId: 'rule-1', type: 'dismiss', config: '{}', orderIndex: 0 },
          ]);
        }
        return Promise.resolve([]);
      });

      mockExecuteActions.mockResolvedValue([{ success: true }]);

      const notification = makeNotification();
      const results = await ruleEngine.evaluate(notification);

      expect(results).toHaveLength(1);
      expect(results[0].ruleId).toBe('rule-1');
      expect(results[0].notificationId).toBe('notif-1');
      expect(results[0].status).toBe('success');
      expect(results[0].actionsExecuted).toEqual([
        { type: 'dismiss', success: true },
      ]);
      expect(results[0].durationMs).toBeGreaterThanOrEqual(0);
      expect(results[0].executedAt).toBeInstanceOf(Date);
    });

    it('marks status as partial when some actions fail', async () => {
      const rule = makeRule();
      mockFindActive.mockResolvedValue([rule]);
      mockTriggerEvaluate.mockReturnValue(true);
      mockEvaluateConditions.mockReturnValue(true);

      mockSelectFrom.mockImplementation((table: any) => {
        if (table?.__table === 'rule_actions') {
          return Promise.resolve([
            { id: 'a1', ruleId: 'rule-1', type: 'dismiss', config: '{}', orderIndex: 0 },
            { id: 'a2', ruleId: 'rule-1', type: 'alarm', config: '{}', orderIndex: 1 },
          ]);
        }
        return Promise.resolve([]);
      });

      // First action succeeds, second fails
      mockExecuteActions.mockResolvedValue([
        { success: true },
        { success: false, error: 'Alarm failed' },
      ]);

      const notification = makeNotification();
      const results = await ruleEngine.evaluate(notification);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('partial');
      expect(results[0].actionsExecuted).toEqual([
        { type: 'dismiss', success: true },
        { type: 'alarm', success: false, error: 'Alarm failed' },
      ]);
    });

    it('marks status as failed when all actions fail', async () => {
      const rule = makeRule();
      mockFindActive.mockResolvedValue([rule]);
      mockTriggerEvaluate.mockReturnValue(true);
      mockEvaluateConditions.mockReturnValue(true);

      mockSelectFrom.mockImplementation((table: any) => {
        if (table?.__table === 'rule_actions') {
          return Promise.resolve([
            { id: 'a1', ruleId: 'rule-1', type: 'dismiss', config: '{}', orderIndex: 0 },
            { id: 'a2', ruleId: 'rule-1', type: 'alarm', config: '{}', orderIndex: 1 },
          ]);
        }
        return Promise.resolve([]);
      });

      mockExecuteActions.mockResolvedValue([
        { success: false, error: 'Dismiss failed' },
        { success: false, error: 'Alarm failed' },
      ]);

      const notification = makeNotification();
      const results = await ruleEngine.evaluate(notification);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('failed');
    });

    it('persists execution record to database', async () => {
      const rule = makeRule();
      mockFindActive.mockResolvedValue([rule]);
      mockTriggerEvaluate.mockReturnValue(true);
      mockEvaluateConditions.mockReturnValue(true);

      mockSelectFrom.mockImplementation((table: any) => {
        if (table?.__table === 'rule_actions') {
          return Promise.resolve([
            { id: 'a1', ruleId: 'rule-1', type: 'dismiss', config: '{}', orderIndex: 0 },
          ]);
        }
        return Promise.resolve([]);
      });

      mockExecuteActions.mockResolvedValue([{ success: true }]);

      const notification = makeNotification();
      await ruleEngine.evaluate(notification);

      expect(mockCreateExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: 'rule-1',
          notificationId: 'notif-1',
          status: 'success',
          actionsExecuted: expect.any(String),
          errorDetails: null,
          durationMs: expect.any(Number),
          executedAt: expect.any(Date),
        })
      );
    });

    it('emits rule:executed event for each matched rule', async () => {
      const rule = makeRule();
      mockFindActive.mockResolvedValue([rule]);
      mockTriggerEvaluate.mockReturnValue(true);
      mockEvaluateConditions.mockReturnValue(true);

      mockSelectFrom.mockImplementation((table: any) => {
        if (table?.__table === 'rule_actions') {
          return Promise.resolve([
            { id: 'a1', ruleId: 'rule-1', type: 'dismiss', config: '{}', orderIndex: 0 },
          ]);
        }
        return Promise.resolve([]);
      });

      mockExecuteActions.mockResolvedValue([{ success: true }]);

      const notification = makeNotification();
      await ruleEngine.evaluate(notification);

      expect(mockEmit).toHaveBeenCalledWith(
        'rule:executed',
        expect.objectContaining({
          ruleId: 'rule-1',
          notificationId: 'notif-1',
          status: 'success',
        })
      );
    });

    it('logs execution result with all required fields', async () => {
      const rule = makeRule();
      mockFindActive.mockResolvedValue([rule]);
      mockTriggerEvaluate.mockReturnValue(true);
      mockEvaluateConditions.mockReturnValue(true);

      mockSelectFrom.mockImplementation((table: any) => {
        if (table?.__table === 'rule_actions') {
          return Promise.resolve([
            { id: 'a1', ruleId: 'rule-1', type: 'dismiss', config: '{}', orderIndex: 0 },
          ]);
        }
        return Promise.resolve([]);
      });

      mockExecuteActions.mockResolvedValue([{ success: true }]);

      const notification = makeNotification();
      const results = await ruleEngine.evaluate(notification);

      // Verify all required fields in the result
      const result = results[0];
      expect(result).toHaveProperty('ruleId');
      expect(result).toHaveProperty('notificationId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('actionsExecuted');
      expect(result).toHaveProperty('durationMs');
      expect(result).toHaveProperty('executedAt');
      expect(typeof result.durationMs).toBe('number');
      expect(result.executedAt).toBeInstanceOf(Date);
    });

    it('continues evaluating other rules if one has invalid trigger config', async () => {
      const badRule = makeRule({ id: 'bad-rule', triggerConfig: 'not-json{' });
      const goodRule = makeRule({ id: 'good-rule' });
      mockFindActive.mockResolvedValue([badRule, goodRule]);
      mockTriggerEvaluate.mockReturnValue(true);
      mockEvaluateConditions.mockReturnValue(true);

      mockSelectFrom.mockImplementation((table: any) => {
        if (table?.__table === 'rule_actions') {
          return Promise.resolve([
            { id: 'a1', ruleId: 'good-rule', type: 'dismiss', config: '{}', orderIndex: 0 },
          ]);
        }
        return Promise.resolve([]);
      });

      mockExecuteActions.mockResolvedValue([{ success: true }]);

      const notification = makeNotification();
      const results = await ruleEngine.evaluate(notification);

      // The good rule should still execute (bad rule has invalid JSON but still gets parsed to {})
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('skips rules with no registered trigger handler', async () => {
      const rule = makeRule({ triggerType: 'unknown_type' });
      mockFindActive.mockResolvedValue([rule]);
      mockGetTriggerHandler.mockReturnValue(undefined);

      const notification = makeNotification();
      const results = await ruleEngine.evaluate(notification);

      expect(results).toEqual([]);
    });

    it('handles persistence failure gracefully without crashing', async () => {
      const rule = makeRule();
      mockFindActive.mockResolvedValue([rule]);
      mockTriggerEvaluate.mockReturnValue(true);
      mockEvaluateConditions.mockReturnValue(true);

      mockSelectFrom.mockImplementation((table: any) => {
        if (table?.__table === 'rule_actions') {
          return Promise.resolve([
            { id: 'a1', ruleId: 'rule-1', type: 'dismiss', config: '{}', orderIndex: 0 },
          ]);
        }
        return Promise.resolve([]);
      });

      mockExecuteActions.mockResolvedValue([{ success: true }]);
      mockCreateExecution.mockRejectedValue(new Error('DB write failed'));

      const notification = makeNotification();
      // Should not throw
      const results = await ruleEngine.evaluate(notification);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('success');
    });

    it('evaluates multiple rules and returns results for all matches', async () => {
      const rule1 = makeRule({ id: 'rule-1' });
      const rule2 = makeRule({ id: 'rule-2' });
      mockFindActive.mockResolvedValue([rule1, rule2]);
      mockTriggerEvaluate.mockReturnValue(true);
      mockEvaluateConditions.mockReturnValue(true);

      mockSelectFrom.mockImplementation((table: any) => {
        if (table?.__table === 'rule_actions') {
          return Promise.resolve([
            { id: 'a1', ruleId: 'rule-1', type: 'dismiss', config: '{}', orderIndex: 0 },
            { id: 'a2', ruleId: 'rule-2', type: 'alarm', config: '{}', orderIndex: 0 },
          ]);
        }
        return Promise.resolve([]);
      });

      mockExecuteActions.mockResolvedValue([{ success: true }]);

      const notification = makeNotification();
      const results = await ruleEngine.evaluate(notification);

      expect(results).toHaveLength(2);
      expect(results[0].ruleId).toBe('rule-1');
      expect(results[1].ruleId).toBe('rule-2');
    });

    it('includes error details in persisted record for partial failures', async () => {
      const rule = makeRule();
      mockFindActive.mockResolvedValue([rule]);
      mockTriggerEvaluate.mockReturnValue(true);
      mockEvaluateConditions.mockReturnValue(true);

      mockSelectFrom.mockImplementation((table: any) => {
        if (table?.__table === 'rule_actions') {
          return Promise.resolve([
            { id: 'a1', ruleId: 'rule-1', type: 'dismiss', config: '{}', orderIndex: 0 },
            { id: 'a2', ruleId: 'rule-1', type: 'alarm', config: '{}', orderIndex: 1 },
          ]);
        }
        return Promise.resolve([]);
      });

      mockExecuteActions.mockResolvedValue([
        { success: true },
        { success: false, error: 'Alarm service unavailable' },
      ]);

      const notification = makeNotification();
      await ruleEngine.evaluate(notification);

      expect(mockCreateExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'partial',
          errorDetails: 'alarm: Alarm service unavailable',
        })
      );
    });
  });
});
