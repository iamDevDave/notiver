import fc from 'fast-check';
import type { RuleBuilderFormState } from './store/rule-builder-store';
import type { TriggerType } from '../../database/schema/rules';
import type { ConditionType } from './engine/conditions/types';
import type { ActionType } from './engine/actions/types';
import { validateRuleForm } from './utils/rule-validation';

/**
 * Property-Based Test: Rule Validation Accepts Valid and Rejects Invalid
 *
 * Generates arbitrary valid rule configs (non-empty name, valid trigger, at least one action)
 * and arbitrary invalid configs (missing fields, invalid values).
 * Verifies valid configs pass validation and persist, invalid configs reject without persisting.
 *
 * **Validates: Requirements 9.6**
 */

// --- Mocks ---

let mockInsertCalled = false;
let mockCreateCalled = false;
let mockCreatedRule: any = null;

jest.mock('../../database/index', () => ({
  db: {
    insert: jest.fn(() => {
      mockInsertCalled = true;
      return {
        values: jest.fn(() => Promise.resolve()),
      };
    }),
  },
}));

jest.mock('../../database/repositories', () => ({
  ruleRepository: {
    create: jest.fn((entity: any) => {
      mockCreateCalled = true;
      mockCreatedRule = {
        ...entity,
        id: `rule-${Date.now()}`,
        createdAt: new Date(),
      };
      return Promise.resolve(mockCreatedRule);
    }),
  },
}));

import { persistRule } from './utils/rule-persistence';

// --- Constants ---

const TRIGGER_TYPES: TriggerType[] = ['app', 'keyword', 'contact', 'time', 'location', 'frequency'];

const ACTION_TYPES: ActionType[] = [
  'dismiss', 'delay', 'alarm', 'vibrate', 'reply',
  'launch_app', 'batch', 'webhook', 'copy', 'speak',
];

const CONDITION_TYPES: ConditionType[] = [
  'contains', 'not_contains', 'regex', 'category', 'priority', 'time_window',
];

// --- Custom Arbitraries ---

/** Generates a non-empty trimmed string (valid name) */
const validNameArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/** Generates a valid trigger type */
const triggerTypeArb = fc.constantFrom(...TRIGGER_TYPES);

/** Generates a valid action type */
const actionTypeArb = fc.constantFrom(...ACTION_TYPES);

/** Generates a valid condition type */
const conditionTypeArb = fc.constantFrom(...CONDITION_TYPES);

/**
 * Generates a valid trigger config based on trigger type.
 * Each trigger type has specific required fields.
 */
function validTriggerConfigArb(triggerType: TriggerType): fc.Arbitrary<Record<string, unknown>> {
  switch (triggerType) {
    case 'app':
      return fc.string({ minLength: 1, maxLength: 50 })
        .filter((s) => s.trim().length > 0)
        .map((pkg) => ({ packageNames: pkg }));
    case 'keyword':
      return fc.string({ minLength: 1, maxLength: 50 })
        .filter((s) => s.trim().length > 0)
        .map((kw) => ({ keywords: kw }));
    case 'contact':
      return fc.string({ minLength: 1, maxLength: 50 })
        .filter((s) => s.trim().length > 0)
        .map((c) => ({ contacts: c }));
    case 'time':
      return fc.oneof(
        fc.record({
          startTime: fc.constant('09:00'),
          endTime: fc.constant('17:00'),
        }),
        fc.record({
          startTime: fc.constant('08:00'),
        }),
        fc.record({
          endTime: fc.constant('22:00'),
        }),
      ).map((r) => r as Record<string, unknown>);
    case 'frequency':
      return fc.integer({ min: 1, max: 100 })
        .map((n) => ({ count: String(n) }));
    case 'location':
      // Location is a placeholder, no validation needed
      return fc.constant({});
  }
}

/** Generates a valid builder action */
const validActionArb = fc.tuple(
  fc.uuid(),
  actionTypeArb,
).map(([id, type]) => ({
  id,
  type,
  config: {} as Record<string, unknown>,
}));

/** Generates a valid builder condition */
const validConditionArb = fc.tuple(
  fc.uuid(),
  conditionTypeArb,
  fc.constantFrom('AND' as const, 'OR' as const),
).map(([id, type, logicOperator]) => ({
  id,
  type,
  config: { operator: 'equals', value: 'test', field: 'title' },
  logicOperator,
}));

/** Generates a complete valid rule form state */
const validFormArb: fc.Arbitrary<RuleBuilderFormState> = triggerTypeArb.chain((triggerType) =>
  fc.tuple(
    validNameArb,
    fc.string({ minLength: 0, maxLength: 100 }), // description (optional)
    validTriggerConfigArb(triggerType),
    fc.array(validConditionArb, { minLength: 0, maxLength: 3 }),
    fc.array(validActionArb, { minLength: 1, maxLength: 5 }),
  ).map(([name, description, triggerConfig, conditions, actions]) => ({
    name,
    description,
    triggerType,
    triggerConfig,
    conditions,
    actions,
  }))
);

/**
 * Generates an invalid form state. Invalid means one of:
 * - Empty/whitespace-only name
 * - No trigger type (null)
 * - No actions (empty array)
 * - Invalid trigger config (missing required fields)
 */
const invalidFormArb: fc.Arbitrary<RuleBuilderFormState> = fc.oneof(
  // Case 1: Empty name
  triggerTypeArb.chain((triggerType) =>
    fc.tuple(
      validTriggerConfigArb(triggerType),
      fc.array(validActionArb, { minLength: 1, maxLength: 3 }),
    ).map(([triggerConfig, actions]) => ({
      name: '   ', // whitespace-only
      description: '',
      triggerType,
      triggerConfig,
      conditions: [],
      actions,
    }))
  ),
  // Case 2: No trigger type
  fc.tuple(
    validNameArb,
    fc.array(validActionArb, { minLength: 1, maxLength: 3 }),
  ).map(([name, actions]) => ({
    name,
    description: '',
    triggerType: null,
    triggerConfig: {},
    conditions: [],
    actions,
  })),
  // Case 3: No actions
  triggerTypeArb.chain((triggerType) =>
    fc.tuple(
      validNameArb,
      validTriggerConfigArb(triggerType),
    ).map(([name, triggerConfig]) => ({
      name,
      description: '',
      triggerType,
      triggerConfig,
      conditions: [],
      actions: [], // empty actions
    }))
  ),
  // Case 4: Invalid trigger config (missing required fields for non-location triggers)
  fc.constantFrom('app' as TriggerType, 'keyword' as TriggerType, 'contact' as TriggerType, 'frequency' as TriggerType)
    .chain((triggerType) =>
      fc.tuple(
        validNameArb,
        fc.array(validActionArb, { minLength: 1, maxLength: 3 }),
      ).map(([name, actions]) => ({
        name,
        description: '',
        triggerType,
        triggerConfig: {}, // empty config — missing required fields
        conditions: [],
        actions,
      }))
    ),
);

// --- Property Tests ---

describe('Property 9: Rule Validation Accepts Valid and Rejects Invalid', () => {
  beforeEach(() => {
    mockInsertCalled = false;
    mockCreateCalled = false;
    mockCreatedRule = null;
    jest.clearAllMocks();
  });

  it('valid rule configs pass validation', async () => {
    await fc.assert(
      fc.asyncProperty(validFormArb, async (form) => {
        const validation = validateRuleForm(form);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it('valid rule configs persist successfully', async () => {
    await fc.assert(
      fc.asyncProperty(validFormArb, async (form) => {
        mockInsertCalled = false;
        mockCreateCalled = false;
        jest.clearAllMocks();

        const result = await persistRule(form);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.ruleId).toBeDefined();
          expect(typeof result.ruleId).toBe('string');
        }
        // Rule was created in the repository
        expect(mockCreateCalled).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('invalid rule configs are rejected by validation', async () => {
    await fc.assert(
      fc.asyncProperty(invalidFormArb, async (form) => {
        const validation = validateRuleForm(form);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('invalid rule configs do not persist', async () => {
    await fc.assert(
      fc.asyncProperty(invalidFormArb, async (form) => {
        mockInsertCalled = false;
        mockCreateCalled = false;
        jest.clearAllMocks();

        const result = await persistRule(form);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.validation.isValid).toBe(false);
          expect(result.validation.errors.length).toBeGreaterThan(0);
        }
        // No database writes should have occurred
        expect(mockCreateCalled).toBe(false);
        expect(mockInsertCalled).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
