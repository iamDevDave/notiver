import fc from 'fast-check';
import type { ParsedNotification } from '../../../../services/notification/parser';
import type { RuleCondition, ConditionType } from './types';
import { evaluateConditions } from './index';

/**
 * Property-Based Test: Condition Logic Boolean Evaluation
 *
 * Generates arbitrary condition sets with AND/OR operators and verifies:
 * - AND requires all conditions true
 * - OR requires at least one condition true
 * - Evaluation respects orderIndex sequence
 *
 * **Validates: Requirements 9.3**
 */

// --- Helpers ---

/**
 * Creates a notification with a known content and priority for deterministic evaluation.
 */
function makeNotification(overrides: Partial<ParsedNotification> = {}): ParsedNotification {
  return {
    id: 'test-notif-1',
    packageName: 'com.test.app',
    appName: 'Test App',
    title: 'Test Title',
    content: 'This is test content with keyword_match_true inside',
    sender: 'Test Sender',
    priority: 5,
    isRead: false,
    isArchived: false,
    rawData: null,
    receivedAt: new Date('2024-06-15T12:00:00Z'),
    createdAt: new Date('2024-06-15T12:00:00Z'),
    ...overrides,
  };
}

/**
 * Creates a condition that is guaranteed to evaluate to `true` against our test notification.
 * Uses 'contains' type with a value known to be in the notification content.
 */
function makeTrueCondition(id: string, logicOperator: 'AND' | 'OR', orderIndex: number): RuleCondition {
  return {
    id,
    ruleId: 'rule-1',
    type: 'contains' as ConditionType,
    config: { operator: 'contains', value: 'keyword_match_true', field: 'content' },
    logicOperator,
    orderIndex,
  };
}

/**
 * Creates a condition that is guaranteed to evaluate to `false` against our test notification.
 * Uses 'contains' type with a value known NOT to be in the notification content.
 */
function makeFalseCondition(id: string, logicOperator: 'AND' | 'OR', orderIndex: number): RuleCondition {
  return {
    id,
    ruleId: 'rule-1',
    type: 'contains' as ConditionType,
    config: { operator: 'contains', value: 'xyz_no_match_ever_999', field: 'content' },
    logicOperator,
    orderIndex,
  };
}

// --- Custom Arbitraries ---

/** Arbitrary for logic operator */
const logicOperatorArb = fc.constantFrom('AND' as const, 'OR' as const);

/** Arbitrary for a boolean outcome (true/false condition) */
const booleanOutcomeArb = fc.boolean();

/** Arbitrary for a condition with a known boolean outcome */
const conditionWithOutcomeArb = (index: number) =>
  fc.record({
    outcome: booleanOutcomeArb,
    logicOperator: logicOperatorArb,
  }).map(({ outcome, logicOperator }) => ({
    condition: outcome
      ? makeTrueCondition(`cond-${index}`, logicOperator, index)
      : makeFalseCondition(`cond-${index}`, logicOperator, index),
    outcome,
    logicOperator,
  }));

/**
 * Generates a non-empty array of conditions with known outcomes.
 * Each condition has a deterministic true/false result and a logic operator.
 */
const conditionSetArb = fc.integer({ min: 1, max: 10 }).chain((size) =>
  fc.tuple(
    ...Array.from({ length: size }, (_, i) => conditionWithOutcomeArb(i))
  )
);

/**
 * Computes the expected boolean result by simulating the evaluateConditions logic:
 * - First condition's result is the initial accumulator
 * - Subsequent conditions combine with the accumulator using their logicOperator
 */
function computeExpectedResult(conditionsWithOutcomes: Array<{ outcome: boolean; logicOperator: 'AND' | 'OR' }>): boolean {
  if (conditionsWithOutcomes.length === 0) return true;

  let result = conditionsWithOutcomes[0].outcome;

  for (let i = 1; i < conditionsWithOutcomes.length; i++) {
    const { outcome, logicOperator } = conditionsWithOutcomes[i];
    if (logicOperator === 'OR') {
      result = result || outcome;
    } else {
      result = result && outcome;
    }
  }

  return result;
}

// --- Property Tests ---

describe('Property 8: Condition Logic Boolean Evaluation', () => {
  const notification = makeNotification();

  it('evaluateConditions follows standard boolean logic with AND/OR operators', () => {
    fc.assert(
      fc.property(conditionSetArb, (conditionsWithOutcomes) => {
        const conditions = conditionsWithOutcomes.map((c) => c.condition);
        const expected = computeExpectedResult(conditionsWithOutcomes);

        const actual = evaluateConditions(conditions, notification);

        expect(actual).toBe(expected);
      }),
      { numRuns: 500 }
    );
  });

  it('AND with all true conditions always returns true', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (count) => {
          const conditions: RuleCondition[] = Array.from({ length: count }, (_, i) =>
            makeTrueCondition(`cond-${i}`, 'AND', i)
          );

          expect(evaluateConditions(conditions, notification)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('AND with at least one false condition returns false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 1, max: 9 }),
        (count, falseIndex) => {
          const adjustedFalseIndex = falseIndex % count;
          // Ensure at least one false condition exists (not at index 0 to keep it simple)
          const actualFalseIndex = adjustedFalseIndex === 0 ? 1 : adjustedFalseIndex;
          const safeCount = Math.max(count, actualFalseIndex + 1);

          const conditions: RuleCondition[] = Array.from({ length: safeCount }, (_, i) => {
            if (i === actualFalseIndex) {
              return makeFalseCondition(`cond-${i}`, 'AND', i);
            }
            return makeTrueCondition(`cond-${i}`, 'AND', i);
          });

          expect(evaluateConditions(conditions, notification)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('OR with at least one true condition returns true', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 0, max: 9 }),
        (count, trueIndex) => {
          const adjustedTrueIndex = trueIndex % count;

          const conditions: RuleCondition[] = Array.from({ length: count }, (_, i) => {
            if (i === adjustedTrueIndex) {
              return makeTrueCondition(`cond-${i}`, i === 0 ? 'AND' : 'OR', i);
            }
            return makeFalseCondition(`cond-${i}`, i === 0 ? 'AND' : 'OR', i);
          });

          // If the true condition is at index 0, it's the initial value
          // Subsequent OR conditions: false OR ... OR false = depends on initial
          // If true is at index 0: true OR false OR false ... = true
          // If true is at index > 0: false OR ... OR true ... = true (since all are OR)
          expect(evaluateConditions(conditions, notification)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('OR with all false conditions returns false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (count) => {
          const conditions: RuleCondition[] = Array.from({ length: count }, (_, i) =>
            makeFalseCondition(`cond-${i}`, i === 0 ? 'AND' : 'OR', i)
          );

          expect(evaluateConditions(conditions, notification)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('evaluation respects orderIndex sequence regardless of array order', () => {
    fc.assert(
      fc.property(conditionSetArb, (conditionsWithOutcomes) => {
        const conditions = conditionsWithOutcomes.map((c) => c.condition);

        // Shuffle the conditions array (but orderIndex stays the same)
        const shuffled = [...conditions].sort(() => Math.random() - 0.5);

        const resultOriginal = evaluateConditions(conditions, notification);
        const resultShuffled = evaluateConditions(shuffled, notification);

        // Both should produce the same result because evaluateConditions sorts by orderIndex
        expect(resultShuffled).toBe(resultOriginal);
      }),
      { numRuns: 200 }
    );
  });

  it('empty conditions array always returns true', () => {
    fc.assert(
      fc.property(
        fc.constant([]),
        (conditions: RuleCondition[]) => {
          expect(evaluateConditions(conditions, notification)).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('single condition result equals the condition evaluation itself', () => {
    fc.assert(
      fc.property(
        booleanOutcomeArb,
        logicOperatorArb,
        (outcome, logicOp) => {
          const condition = outcome
            ? makeTrueCondition('cond-0', logicOp, 0)
            : makeFalseCondition('cond-0', logicOp, 0);

          // Single condition: result is just the condition's evaluation
          expect(evaluateConditions([condition], notification)).toBe(outcome);
        }
      ),
      { numRuns: 100 }
    );
  });
});
