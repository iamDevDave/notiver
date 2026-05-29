import fc from 'fast-check';
import type { ParsedNotification } from '../../../services/notification/parser';
import type { ExecutionStatus } from '../../../database/schema/rule-executions';
import type { ActionType } from './actions';

/**
 * Property-Based Test: Rule Execution History Completeness
 *
 * Generates arbitrary rule executions and verifies that the persisted record
 * contains all required fields: ruleId, notificationId, timestamp, actions list,
 * status, and durationMs.
 *
 * **Validates: Requirements 8.7**
 */

// --- Mocks ---

const mockSelectFrom = jest.fn();
jest.mock('../../../database/index', () => ({
  db: {
    select: jest.fn(() => ({
      from: (table: unknown) => mockSelectFrom(table),
    })),
  },
}));

const mockFindActive = jest.fn();
const mockCreateExecution = jest.fn();

jest.mock('../../../database/repositories', () => ({
  ruleRepository: {
    findActive: (...args: unknown[]) => mockFindActive(...args),
  },
  ruleExecutionRepository: {
    create: (...args: unknown[]) => mockCreateExecution(...args),
  },
}));

const mockEmit = jest.fn();
const mockOn = jest.fn();
const mockUnsubscribe = jest.fn();

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

jest.mock('../../../services/performance', () => ({
  logRuleEvalMetrics: jest.fn(),
}));

jest.mock('../../../database/schema', () => ({
  ruleConditions: { __table: 'rule_conditions' },
  ruleActions: { __table: 'rule_actions' },
}));

const mockTriggerEvaluate = jest.fn();
jest.mock('./triggers', () => ({
  getTriggerHandler: () => ({
    evaluate: (...args: unknown[]) => mockTriggerEvaluate(...args),
  }),
}));

const mockEvaluateConditions = jest.fn();
jest.mock('./conditions', () => ({
  evaluateConditions: (...args: unknown[]) => mockEvaluateConditions(...args),
}));

const mockExecuteActions = jest.fn();
jest.mock('./actions', () => ({
  executeActions: (...args: unknown[]) => mockExecuteActions(...args),
}));

import { ruleEngine } from './engine';

// --- Custom Arbitraries ---

/** Arbitrary for valid action types */
const actionTypeArb: fc.Arbitrary<ActionType> = fc.constantFrom(
  'dismiss', 'delay', 'alarm', 'vibrate', 'reply',
  'launch_app', 'batch', 'webhook', 'copy', 'speak', 'click', 'expand'
);

/** Arbitrary for a rule action row (as returned from DB) */
const ruleActionRowArb = (ruleId: string) =>
  fc.record({
    id: fc.uuid(),
    ruleId: fc.constant(ruleId),
    type: actionTypeArb,
    config: fc.constant('{}'),
    orderIndex: fc.nat({ max: 20 }),
  });

/** Arbitrary for action results (success or failure) */
const actionResultArb = fc.record({
  success: fc.boolean(),
  error: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
});

/** Arbitrary for a package name */
const packageNameArb = fc.stringMatching(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){1,3}$/);

/** Arbitrary for a notification */
const notificationArb: fc.Arbitrary<ParsedNotification> = fc.record({
  id: fc.uuid(),
  packageName: packageNameArb,
  appName: fc.string({ minLength: 1, maxLength: 50 }),
  title: fc.string({ minLength: 0, maxLength: 100 }),
  content: fc.string({ minLength: 0, maxLength: 200 }),
  sender: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
  priority: fc.integer({ min: 0, max: 5 }),
  isRead: fc.boolean(),
  isArchived: fc.boolean(),
  rawData: fc.constant(null),
  receivedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
});

/** Arbitrary for a rule (as returned from ruleRepository.findActive) */
const ruleArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.constant(null),
  triggerType: fc.constantFrom('app', 'keyword', 'contact', 'time', 'frequency'),
  triggerConfig: fc.constant(JSON.stringify({ keywords: ['test'] })),
  isActive: fc.constant(true),
  priority: fc.integer({ min: 0, max: 10 }),
  executionCount: fc.nat({ max: 1000 }),
  lastTriggeredAt: fc.constant(null),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
});

/**
 * Generates a complete test scenario: a notification, a rule, actions for that rule,
 * and the action results (simulating what executeActions would return).
 */
const executionScenarioArb = fc.record({
  notification: notificationArb,
  rule: ruleArb,
  actionCount: fc.integer({ min: 1, max: 5 }),
}).chain(({ notification, rule, actionCount }) =>
  fc.tuple(
    fc.constant(notification),
    fc.constant(rule),
    fc.array(ruleActionRowArb(rule.id), { minLength: actionCount, maxLength: actionCount }),
    fc.array(actionResultArb, { minLength: actionCount, maxLength: actionCount }),
  )
);

// --- Helper to set up mocks for a single evaluation ---

/** Captured persisted records for the current iteration */
let iterationPersistedRecords: any[] = [];

function setupMocksForEvaluation(
  rule: Record<string, unknown>,
  actions: Array<Record<string, unknown>>,
  actionResults: Array<{ success: boolean; error?: string }>
) {
  // Fully invalidate the rule cache to force fresh load
  (ruleEngine as any).ruleCache = null;
  (ruleEngine as any).ruleCacheTimestamp = 0;

  // Reset iteration-specific capture
  iterationPersistedRecords = [];

  mockTriggerEvaluate.mockReturnValue(true);
  mockEvaluateConditions.mockReturnValue(true);
  mockCreateExecution.mockImplementation((record: any) => {
    iterationPersistedRecords.push(record);
    return Promise.resolve({ id: 'exec-1' });
  });
  mockFindActive.mockResolvedValue([rule]);
  mockSelectFrom.mockImplementation((table: any) => {
    if (table?.__table === 'rule_actions') {
      return Promise.resolve(actions);
    }
    return Promise.resolve([]);
  });
  mockExecuteActions.mockResolvedValue(actionResults);
}

// --- Property Tests ---

describe('Property 7: Rule Execution History Completeness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ruleEngine as any).ruleCache = null;
    (ruleEngine as any).ruleCacheTimestamp = 0;
  });

  it('execution result and persisted record both contain all required fields: ruleId, notificationId, timestamp, actions list, status, durationMs', () => {
    fc.assert(
      fc.asyncProperty(executionScenarioArb, async ([notification, rule, actions, actionResults]) => {
        setupMocksForEvaluation(rule, actions, actionResults);

        // Execute
        const results = await ruleEngine.evaluate(notification);

        // Verify: at least one result (since trigger matches and conditions pass)
        expect(results.length).toBe(1);

        const result = results[0];

        // --- Verify returned result has all required fields ---

        // Required field: ruleId
        expect(result).toHaveProperty('ruleId');
        expect(typeof result.ruleId).toBe('string');
        expect(result.ruleId).toBe(rule.id);

        // Required field: notificationId
        expect(result).toHaveProperty('notificationId');
        expect(typeof result.notificationId).toBe('string');
        expect(result.notificationId).toBe(notification.id);

        // Required field: executedAt (timestamp)
        expect(result).toHaveProperty('executedAt');
        expect(result.executedAt).toBeInstanceOf(Date);
        expect(Number.isNaN(result.executedAt.getTime())).toBe(false);

        // Required field: actionsExecuted (actions list)
        expect(result).toHaveProperty('actionsExecuted');
        expect(Array.isArray(result.actionsExecuted)).toBe(true);
        expect(result.actionsExecuted.length).toBeGreaterThan(0);

        // Each action in the list must have type and success fields
        for (const action of result.actionsExecuted) {
          expect(action).toHaveProperty('type');
          expect(typeof action.type).toBe('string');
          expect(action).toHaveProperty('success');
          expect(typeof action.success).toBe('boolean');
        }

        // Required field: status
        expect(result).toHaveProperty('status');
        expect(['success', 'partial', 'failed']).toContain(result.status);

        // Required field: durationMs
        expect(result).toHaveProperty('durationMs');
        expect(typeof result.durationMs).toBe('number');
        expect(Number.isFinite(result.durationMs)).toBe(true);
        expect(result.durationMs).toBeGreaterThanOrEqual(0);

        // --- Verify persisted record has all required fields ---
        // The engine calls ruleExecutionRepository.create() with the execution data
        expect(iterationPersistedRecords.length).toBeGreaterThan(0);

        // Get the record persisted during this iteration
        const persistedRecord = iterationPersistedRecords[0];

        // Required field: ruleId
        expect(persistedRecord).toHaveProperty('ruleId');
        expect(typeof persistedRecord.ruleId).toBe('string');
        expect(persistedRecord.ruleId).toBe(rule.id);

        // Required field: notificationId
        expect(persistedRecord).toHaveProperty('notificationId');
        expect(typeof persistedRecord.notificationId).toBe('string');
        expect(persistedRecord.notificationId).toBe(notification.id);

        // Required field: executedAt (timestamp)
        expect(persistedRecord).toHaveProperty('executedAt');
        expect(persistedRecord.executedAt).toBeInstanceOf(Date);

        // Required field: actionsExecuted (serialized actions list)
        expect(persistedRecord).toHaveProperty('actionsExecuted');
        expect(typeof persistedRecord.actionsExecuted).toBe('string');
        const parsedActions = JSON.parse(persistedRecord.actionsExecuted);
        expect(Array.isArray(parsedActions)).toBe(true);
        expect(parsedActions.length).toBeGreaterThan(0);

        // Each persisted action must have type and success
        for (const action of parsedActions) {
          expect(action).toHaveProperty('type');
          expect(typeof action.type).toBe('string');
          expect(action).toHaveProperty('success');
          expect(typeof action.success).toBe('boolean');
        }

        // Required field: status
        expect(persistedRecord).toHaveProperty('status');
        expect(['success', 'partial', 'failed']).toContain(persistedRecord.status);

        // Required field: durationMs
        expect(persistedRecord).toHaveProperty('durationMs');
        expect(typeof persistedRecord.durationMs).toBe('number');
        expect(Number.isFinite(persistedRecord.durationMs)).toBe(true);
        expect(persistedRecord.durationMs).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  it('status correctly reflects action outcomes for any combination of successes and failures', () => {
    fc.assert(
      fc.asyncProperty(executionScenarioArb, async ([notification, rule, actions, actionResults]) => {
        setupMocksForEvaluation(rule, actions, actionResults);

        // Execute
        const results = await ruleEngine.evaluate(notification);
        expect(results.length).toBe(1);

        const result = results[0];
        const allSucceeded = actionResults.every((r) => r.success);
        const allFailed = actionResults.every((r) => !r.success);

        // Verify status matches the action outcomes
        if (allSucceeded) {
          expect(result.status).toBe('success');
        } else if (allFailed) {
          expect(result.status).toBe('failed');
        } else {
          expect(result.status).toBe('partial');
        }
      }),
      { numRuns: 100 }
    );
  });
});
