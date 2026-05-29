import fc from 'fast-check';
import type { ParsedNotification } from '../../../services/notification/parser';
import type { ActionType } from './actions/types';

/**
 * Property-Based Test: Rule Evaluation Executes Matching Actions in Sequence
 *
 * Generates arbitrary notifications and active rules, then verifies that
 * matching rules execute actions in orderIndex sequence and log results.
 *
 * **Validates: Requirements 8.5**
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

const mockGetTriggerHandler = jest.fn();
jest.mock('./triggers', () => ({
  getTriggerHandler: (...args: unknown[]) => mockGetTriggerHandler(...args),
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

/** Valid action types from the ActionType union */
const ACTION_TYPES: ActionType[] = [
  'dismiss', 'delay', 'alarm', 'vibrate', 'reply',
  'launch_app', 'batch', 'webhook', 'copy', 'speak',
];

/** Arbitrary for ActionType */
const actionTypeArb = fc.constantFrom(...ACTION_TYPES);

/** Arbitrary for a ParsedNotification */
const notificationArb: fc.Arbitrary<ParsedNotification> = fc.record({
  id: fc.uuid(),
  packageName: fc.stringMatching(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){1,3}$/),
  appName: fc.string({ minLength: 1, maxLength: 50 }),
  title: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 100 })),
  content: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 200 })),
  sender: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
  priority: fc.integer({ min: 0, max: 5 }),
  isRead: fc.boolean(),
  isArchived: fc.boolean(),
  rawData: fc.constant(null),
  receivedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
});

/** Arbitrary for a rule action row (as returned from DB batch load) */
const ruleActionArb = (ruleId: string) =>
  fc.record({
    id: fc.uuid(),
    ruleId: fc.constant(ruleId),
    type: actionTypeArb,
    config: fc.constant('{}'),
    orderIndex: fc.integer({ min: 0, max: 100 }),
  });

/** Arbitrary for a rule with 1-5 actions */
const ruleWithActionsArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.constant(null),
  triggerType: fc.constantFrom('app', 'keyword', 'contact', 'time', 'location', 'frequency'),
  triggerConfig: fc.constant(JSON.stringify({ keywords: ['test'] })),
  isActive: fc.constant(true),
  priority: fc.integer({ min: 0, max: 10 }),
  executionCount: fc.constant(0),
  lastTriggeredAt: fc.constant(null),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
}).chain((rule) =>
  fc.tuple(
    fc.constant(rule),
    fc.array(ruleActionArb(rule.id), { minLength: 1, maxLength: 5 })
  )
);

// --- Helper to set up mocks for a single evaluation ---

function setupMocksForEvaluation(
  rule: Record<string, any>,
  actions: Array<Record<string, any>>,
  options: { triggerMatches?: boolean; conditionsPass?: boolean } = {}
) {
  const { triggerMatches = true, conditionsPass = true } = options;

  // Invalidate cache
  (ruleEngine as any).ruleCache = null;
  (ruleEngine as any).ruleCacheTimestamp = 0;

  mockFindActive.mockResolvedValue([rule]);
  mockGetTriggerHandler.mockReturnValue({
    evaluate: () => triggerMatches,
  });
  mockEvaluateConditions.mockReturnValue(conditionsPass);

  mockSelectFrom.mockImplementation((table: any) => {
    if (table?.__table === 'rule_actions') {
      return Promise.resolve(actions);
    }
    return Promise.resolve([]);
  });

  mockExecuteActions.mockImplementation((receivedActions: any[]) => {
    return Promise.resolve(
      receivedActions.map(() => ({ success: true }))
    );
  });

  mockCreateExecution.mockResolvedValue({ id: 'exec-1' });
}

// --- Property Tests ---

describe('Property 5: Rule Evaluation Executes Matching Actions in Sequence', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Invalidate the rule cache before each test
    (ruleEngine as any).ruleCache = null;
    (ruleEngine as any).ruleCacheTimestamp = 0;

    // Default: batch-load returns empty arrays
    mockSelectFrom.mockImplementation(() => Promise.resolve([]));

    // Default: no active rules
    mockFindActive.mockResolvedValue([]);
    mockCreateExecution.mockResolvedValue({ id: 'exec-1' });
  });

  it('matching rules execute actions sorted by orderIndex and log results', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationArb,
        ruleWithActionsArb,
        async (notification, [rule, actions]) => {
          setupMocksForEvaluation(rule, actions);

          const results = await ruleEngine.evaluate(notification);

          // Verify: exactly one result for the matching rule
          expect(results.length).toBe(1);

          const result = results[0];

          // Verify: result references correct rule and notification
          expect(result.ruleId).toBe(rule.id);
          expect(result.notificationId).toBe(notification.id);

          // Verify: status is 'success' since all actions succeed
          expect(result.status).toBe('success');

          // Verify: actionsExecuted contains entries for each action
          expect(result.actionsExecuted.length).toBe(actions.length);

          // Verify: actionsExecuted are in orderIndex sequence
          const sortedActions = [...actions].sort((a, b) => a.orderIndex - b.orderIndex);
          for (let i = 0; i < result.actionsExecuted.length; i++) {
            expect(result.actionsExecuted[i].type).toBe(sortedActions[i].type);
            expect(result.actionsExecuted[i].success).toBe(true);
          }

          // Verify: durationMs is a non-negative number
          expect(result.durationMs).toBeGreaterThanOrEqual(0);

          // Verify: executedAt is a valid Date
          expect(result.executedAt).toBeInstanceOf(Date);

          // Verify: execution was persisted to database
          expect(mockCreateExecution).toHaveBeenCalledWith(
            expect.objectContaining({
              ruleId: rule.id,
              notificationId: notification.id,
              status: 'success',
            })
          );

          // Verify: rule:executed event was emitted
          expect(mockEmit).toHaveBeenCalledWith(
            'rule:executed',
            expect.objectContaining({
              ruleId: rule.id,
              notificationId: notification.id,
              status: 'success',
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('actions are passed to executeActions in orderIndex-sorted order', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationArb,
        ruleWithActionsArb,
        async (notification, [rule, actions]) => {
          setupMocksForEvaluation(rule, actions);

          let capturedActions: any[] = [];
          mockExecuteActions.mockImplementation((receivedActions: any[]) => {
            capturedActions = receivedActions;
            return Promise.resolve(
              receivedActions.map(() => ({ success: true }))
            );
          });

          await ruleEngine.evaluate(notification);

          // Verify: executeActions was called with actions sorted by orderIndex
          expect(capturedActions.length).toBe(actions.length);
          for (let i = 1; i < capturedActions.length; i++) {
            expect(capturedActions[i].orderIndex).toBeGreaterThanOrEqual(
              capturedActions[i - 1].orderIndex
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('non-matching rules produce no execution results', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationArb,
        ruleWithActionsArb,
        async (notification, [rule, actions]) => {
          setupMocksForEvaluation(rule, actions, { triggerMatches: false });

          const results = await ruleEngine.evaluate(notification);

          // No results when trigger doesn't match
          expect(results).toEqual([]);
          // Actions should not be executed
          expect(mockExecuteActions).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple matching rules each produce a logged execution result', async () => {
    const multipleRulesArb = fc.array(ruleWithActionsArb, { minLength: 2, maxLength: 4 });

    await fc.assert(
      fc.asyncProperty(
        notificationArb,
        multipleRulesArb,
        async (notification, rulesWithActions) => {
          const rules = rulesWithActions.map(([rule]) => rule);
          const allActions = rulesWithActions.flatMap(([, actions]) => actions);

          // Invalidate cache and clear call counts
          (ruleEngine as any).ruleCache = null;
          (ruleEngine as any).ruleCacheTimestamp = 0;
          mockCreateExecution.mockClear();
          mockEmit.mockClear();

          mockFindActive.mockResolvedValue(rules);
          mockGetTriggerHandler.mockReturnValue({ evaluate: () => true });
          mockEvaluateConditions.mockReturnValue(true);

          mockSelectFrom.mockImplementation((table: any) => {
            if (table?.__table === 'rule_actions') {
              return Promise.resolve(allActions);
            }
            return Promise.resolve([]);
          });

          mockExecuteActions.mockImplementation((receivedActions: any[]) => {
            return Promise.resolve(
              receivedActions.map(() => ({ success: true }))
            );
          });

          mockCreateExecution.mockResolvedValue({ id: 'exec-1' });

          const results = await ruleEngine.evaluate(notification);

          // Each matching rule should produce a result
          expect(results.length).toBe(rules.length);

          // Each result should reference the correct rule and notification
          for (let i = 0; i < results.length; i++) {
            expect(results[i].ruleId).toBe(rules[i].id);
            expect(results[i].notificationId).toBe(notification.id);
            expect(results[i].executedAt).toBeInstanceOf(Date);
            expect(results[i].durationMs).toBeGreaterThanOrEqual(0);
          }

          // Execution should be persisted for each matching rule
          expect(mockCreateExecution).toHaveBeenCalledTimes(rules.length);

          // rule:executed event should be emitted for each matching rule
          expect(mockEmit).toHaveBeenCalledTimes(rules.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});
