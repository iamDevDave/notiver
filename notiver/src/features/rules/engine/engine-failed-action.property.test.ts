import fc from 'fast-check';
import type { ParsedNotification } from '../../../services/notification/parser';
import type { ActionResult, ActionType, RuleAction } from './actions';

/**
 * Property-Based Test: Failed Action Does Not Block Remaining Actions
 *
 * Generates rules with multiple actions where one fails during execution.
 * Verifies that subsequent actions still execute and the overall status is 'partial'.
 *
 * **Validates: Requirements 8.6**
 */

// --- Shared state for mocks ---

let mockCurrentActionResults: ActionResult[] = [];
let mockTriggerShouldMatch = true;
let mockConditionsShouldPass = true;

// --- Mocks ---

jest.mock('../../../database/index', () => ({
  db: {
    select: jest.fn(() => ({
      from: () => Promise.resolve([]),
    })),
  },
}));

jest.mock('../../../database/repositories', () => ({
  ruleRepository: {
    findActive: jest.fn(() => Promise.resolve([])),
  },
  ruleExecutionRepository: {
    create: jest.fn(() => Promise.resolve({ id: 'exec-1' })),
  },
}));

jest.mock('../../../services/event-bus', () => ({
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(() => jest.fn()),
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

jest.mock('./triggers', () => ({
  getTriggerHandler: () => ({
    evaluate: () => mockTriggerShouldMatch,
  }),
}));

jest.mock('./conditions', () => ({
  evaluateConditions: () => mockConditionsShouldPass,
}));

jest.mock('./actions', () => ({
  executeActions: () => Promise.resolve(mockCurrentActionResults),
}));

import { ruleEngine } from './engine';
import { ruleExecutionRepository } from '../../../database/repositories';

const mockCreateExecution = ruleExecutionRepository.create as jest.Mock;

// --- Custom Arbitraries ---

/** Valid action types from the system */
const ACTION_TYPES: ActionType[] = [
  'dismiss', 'delay', 'alarm', 'vibrate', 'reply',
  'launch_app', 'batch', 'webhook', 'copy', 'speak',
];

/** Arbitrary for action type */
const actionTypeArb = fc.constantFrom(...ACTION_TYPES);

/** Arbitrary for a notification */
const notificationArb: fc.Arbitrary<ParsedNotification> = fc.record({
  id: fc.uuid(),
  packageName: fc.constant('com.test.app'),
  appName: fc.string({ minLength: 1, maxLength: 50 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  content: fc.string({ minLength: 1, maxLength: 200 }),
  sender: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
  priority: fc.integer({ min: 0, max: 5 }),
  isRead: fc.constant(false),
  isArchived: fc.constant(false),
  rawData: fc.constant(null),
  receivedAt: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-12-31') }),
  createdAt: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-12-31') }),
});

/**
 * Generates a list of actions (at least 2) with a designated failing index.
 * Returns { actions, failIndex } where failIndex is the index of the action that fails.
 */
const actionsWithFailureArb = fc
  .integer({ min: 2, max: 6 })
  .chain((count) =>
    fc.tuple(
      fc.array(actionTypeArb, { minLength: count, maxLength: count }),
      fc.integer({ min: 0, max: count - 1 })
    )
  )
  .map(([types, failIndex]) => {
    const actions: RuleAction[] = types.map((type, i) => ({
      id: `action-${i}`,
      ruleId: 'rule-1',
      type,
      config: {},
      orderIndex: i,
    }));
    return { actions, failIndex };
  });

/** Arbitrary for error messages */
const errorMessageArb = fc.string({ minLength: 3, maxLength: 50 }).filter((s) => s.trim().length > 0);

// --- Helper to directly set the rule cache ---

function setupIteration(actions: RuleAction[], failIndex: number, errorMsg: string) {
  // Directly set the rule cache to bypass all DB loading logic
  (ruleEngine as any).ruleCache = [
    {
      id: 'rule-1',
      name: 'Test Rule',
      triggerType: 'keyword',
      triggerConfig: { keywords: ['test'] },
      conditions: [],
      actions: actions.map((a) => ({ ...a })), // deep copy each action
      priority: 0,
    },
  ];
  // Set timestamp to now so cache is considered valid
  (ruleEngine as any).ruleCacheTimestamp = Date.now();

  // Set the shared state that mocks read from
  mockTriggerShouldMatch = true;
  mockConditionsShouldPass = true;

  // Build action results: one fails at failIndex, rest succeed
  mockCurrentActionResults = actions.map((_, i) => {
    if (i === failIndex) {
      return { success: false, error: errorMsg };
    }
    return { success: true };
  });

  mockCreateExecution.mockImplementation(() => Promise.resolve({ id: 'exec-1' }));
}

// --- Property Tests ---

describe('Property 6: Failed Action Does Not Block Remaining Actions', () => {
  beforeEach(() => {
    (ruleEngine as any).ruleCache = null;
    (ruleEngine as any).ruleCacheTimestamp = 0;
    mockCreateExecution.mockClear();
  });

  it('all actions execute even when one fails — subsequent actions are not blocked', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationArb,
        actionsWithFailureArb,
        errorMessageArb,
        async (notification, { actions, failIndex }, errorMsg) => {
          setupIteration(actions, failIndex, errorMsg);

          const results = await ruleEngine.evaluate(notification);

          expect(results).toHaveLength(1);
          const result = results[0];

          // All actions should have results (none were blocked)
          expect(result.actionsExecuted).toHaveLength(actions.length);

          // The failed action should be recorded with its error
          const failedAction = result.actionsExecuted[failIndex];
          expect(failedAction.success).toBe(false);
          expect(failedAction.error).toBe(errorMsg);

          // Actions other than the failed one should have succeeded
          for (let i = 0; i < actions.length; i++) {
            if (i !== failIndex) {
              expect(result.actionsExecuted[i].success).toBe(true);
            }
          }

          // Overall status should be 'partial' (some succeeded, some failed)
          expect(result.status).toBe('partial');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('status is partial when at least one action fails and at least one succeeds', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationArb,
        actionsWithFailureArb,
        errorMessageArb,
        async (notification, { actions, failIndex }, errorMsg) => {
          setupIteration(actions, failIndex, errorMsg);

          const results = await ruleEngine.evaluate(notification);

          expect(results).toHaveLength(1);
          const result = results[0];

          // Status must be 'partial' — not 'failed' (since some succeeded)
          // and not 'success' (since one failed)
          expect(result.status).toBe('partial');

          // Verify the result contains the correct number of action results
          expect(result.actionsExecuted).toHaveLength(actions.length);

          // Count successes and failures
          const successes = result.actionsExecuted.filter((a) => a.success).length;
          const failures = result.actionsExecuted.filter((a) => !a.success).length;

          expect(successes).toBe(actions.length - 1);
          expect(failures).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('error details are logged for the failed action in the persisted record', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationArb,
        actionsWithFailureArb,
        errorMessageArb,
        async (notification, { actions, failIndex }, errorMsg) => {
          setupIteration(actions, failIndex, errorMsg);
          mockCreateExecution.mockClear();

          const results = await ruleEngine.evaluate(notification);

          expect(results).toHaveLength(1);
          const result = results[0];

          // The failed action should have its error recorded in the result
          const failedActionResult = result.actionsExecuted[failIndex];
          expect(failedActionResult.success).toBe(false);
          expect(failedActionResult.error).toBeDefined();
          expect(failedActionResult.error).toBe(errorMsg);

          // Verify the persisted execution record includes error details
          expect(mockCreateExecution).toHaveBeenCalledWith(
            expect.objectContaining({
              status: 'partial',
              errorDetails: expect.stringContaining(errorMsg),
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
