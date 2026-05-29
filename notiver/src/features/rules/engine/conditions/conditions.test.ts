import type { ParsedNotification } from '../../../../services/notification/parser';
import type { RuleCondition, ConditionConfig } from './types';
import { containsEvaluator } from './contains';
import { notContainsEvaluator } from './not-contains';
import { regexEvaluator } from './regex';
import { categoryEvaluator } from './category';
import { priorityEvaluator } from './priority';
import { createTimeWindowEvaluator } from './time-window';
import { evaluateConditions } from './index';

function makeNotification(overrides: Partial<ParsedNotification> = {}): ParsedNotification {
  return {
    id: 'test-id',
    packageName: 'com.example.app',
    appName: 'Example App',
    title: 'Test Title',
    content: 'This is test content with urgent message',
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

function makeCondition(overrides: Partial<RuleCondition> = {}): RuleCondition {
  return {
    id: 'cond-1',
    ruleId: 'rule-1',
    type: 'contains',
    config: { operator: 'contains', value: 'test', field: 'content' },
    logicOperator: 'AND',
    orderIndex: 0,
    ...overrides,
  };
}

describe('Contains Evaluator', () => {
  it('returns true when field contains value (case-insensitive)', () => {
    const notification = makeNotification({ content: 'Hello World' });
    const config: ConditionConfig = { operator: 'contains', value: 'hello', field: 'content' };
    expect(containsEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('returns false when field does not contain value', () => {
    const notification = makeNotification({ content: 'Hello World' });
    const config: ConditionConfig = { operator: 'contains', value: 'goodbye', field: 'content' };
    expect(containsEvaluator.evaluate(notification, config)).toBe(false);
  });

  it('returns true for empty search value', () => {
    const notification = makeNotification({ content: 'Hello' });
    const config: ConditionConfig = { operator: 'contains', value: '', field: 'content' };
    expect(containsEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('checks title field when specified', () => {
    const notification = makeNotification({ title: 'Important Alert' });
    const config: ConditionConfig = { operator: 'contains', value: 'important', field: 'title' };
    expect(containsEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('checks sender field when specified', () => {
    const notification = makeNotification({ sender: 'Jane Smith' });
    const config: ConditionConfig = { operator: 'contains', value: 'jane', field: 'sender' };
    expect(containsEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('defaults to content field when field is not specified', () => {
    const notification = makeNotification({ content: 'urgent message' });
    const config: ConditionConfig = { operator: 'contains', value: 'urgent' };
    expect(containsEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('handles null field values gracefully', () => {
    const notification = makeNotification({ content: null });
    const config: ConditionConfig = { operator: 'contains', value: 'test', field: 'content' };
    expect(containsEvaluator.evaluate(notification, config)).toBe(false);
  });
});

describe('Not Contains Evaluator', () => {
  it('returns true when field does not contain value', () => {
    const notification = makeNotification({ content: 'Hello World' });
    const config: ConditionConfig = { operator: 'not_contains', value: 'goodbye', field: 'content' };
    expect(notContainsEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('returns false when field contains value', () => {
    const notification = makeNotification({ content: 'Hello World' });
    const config: ConditionConfig = { operator: 'not_contains', value: 'hello', field: 'content' };
    expect(notContainsEvaluator.evaluate(notification, config)).toBe(false);
  });

  it('returns true for empty search value', () => {
    const notification = makeNotification({ content: 'Hello' });
    const config: ConditionConfig = { operator: 'not_contains', value: '', field: 'content' };
    expect(notContainsEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('handles null field values gracefully', () => {
    const notification = makeNotification({ title: null });
    const config: ConditionConfig = { operator: 'not_contains', value: 'test', field: 'title' };
    expect(notContainsEvaluator.evaluate(notification, config)).toBe(true);
  });
});

describe('Regex Evaluator', () => {
  it('returns true when field matches regex pattern', () => {
    const notification = makeNotification({ content: 'Order #12345 confirmed' });
    const config: ConditionConfig = { operator: 'i', value: 'order #\\d+', field: 'content' };
    expect(regexEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('returns false when field does not match regex', () => {
    const notification = makeNotification({ content: 'Hello World' });
    const config: ConditionConfig = { operator: 'i', value: '^\\d+$', field: 'content' };
    expect(regexEvaluator.evaluate(notification, config)).toBe(false);
  });

  it('returns false for invalid regex pattern', () => {
    const notification = makeNotification({ content: 'test' });
    const config: ConditionConfig = { operator: 'i', value: '[invalid(', field: 'content' };
    expect(regexEvaluator.evaluate(notification, config)).toBe(false);
  });

  it('returns true for empty pattern', () => {
    const notification = makeNotification({ content: 'test' });
    const config: ConditionConfig = { operator: 'i', value: '', field: 'content' };
    expect(regexEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('uses case-insensitive flag by default', () => {
    const notification = makeNotification({ content: 'URGENT message' });
    const config: ConditionConfig = { operator: '', value: 'urgent', field: 'content' };
    // Empty operator defaults to 'i'
    expect(regexEvaluator.evaluate(notification, config)).toBe(true);
  });
});

describe('Category Evaluator', () => {
  it('returns true when category matches (case-insensitive)', () => {
    const notification = makeNotification() as any;
    notification.category = 'important';
    const config: ConditionConfig = { operator: 'equals', value: 'Important' };
    expect(categoryEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('returns false when category does not match', () => {
    const notification = makeNotification() as any;
    notification.category = 'social';
    const config: ConditionConfig = { operator: 'equals', value: 'work' };
    expect(categoryEvaluator.evaluate(notification, config)).toBe(false);
  });

  it('returns false when notification has no category', () => {
    const notification = makeNotification();
    const config: ConditionConfig = { operator: 'equals', value: 'important' };
    expect(categoryEvaluator.evaluate(notification, config)).toBe(false);
  });

  it('supports not_equals operator', () => {
    const notification = makeNotification() as any;
    notification.category = 'spam';
    const config: ConditionConfig = { operator: 'not_equals', value: 'important' };
    expect(categoryEvaluator.evaluate(notification, config)).toBe(true);
  });
});

describe('Priority Evaluator', () => {
  it('returns true when priority >= threshold (default operator)', () => {
    const notification = makeNotification({ priority: 5 });
    const config: ConditionConfig = { operator: '>=', value: '3' };
    expect(priorityEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('returns false when priority < threshold with >= operator', () => {
    const notification = makeNotification({ priority: 2 });
    const config: ConditionConfig = { operator: '>=', value: '3' };
    expect(priorityEvaluator.evaluate(notification, config)).toBe(false);
  });

  it('supports <= operator', () => {
    const notification = makeNotification({ priority: 2 });
    const config: ConditionConfig = { operator: '<=', value: '3' };
    expect(priorityEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('supports == operator', () => {
    const notification = makeNotification({ priority: 3 });
    const config: ConditionConfig = { operator: '==', value: '3' };
    expect(priorityEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('supports > operator', () => {
    const notification = makeNotification({ priority: 4 });
    const config: ConditionConfig = { operator: '>', value: '3' };
    expect(priorityEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('supports < operator', () => {
    const notification = makeNotification({ priority: 2 });
    const config: ConditionConfig = { operator: '<', value: '3' };
    expect(priorityEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('supports != operator', () => {
    const notification = makeNotification({ priority: 2 });
    const config: ConditionConfig = { operator: '!=', value: '3' };
    expect(priorityEvaluator.evaluate(notification, config)).toBe(true);
  });

  it('returns false for non-numeric threshold', () => {
    const notification = makeNotification({ priority: 5 });
    const config: ConditionConfig = { operator: '>=', value: 'abc' };
    expect(priorityEvaluator.evaluate(notification, config)).toBe(false);
  });
});

describe('Time Window Evaluator', () => {
  it('returns true when current time is within window', () => {
    // 10:30 AM
    const now = new Date('2024-01-15T10:30:00');
    const evaluator = createTimeWindowEvaluator(now);
    const notification = makeNotification();
    const config: ConditionConfig = { operator: 'within', value: '09:00-17:00' };
    expect(evaluator.evaluate(notification, config)).toBe(true);
  });

  it('returns false when current time is outside window', () => {
    // 8:00 AM
    const now = new Date('2024-01-15T08:00:00');
    const evaluator = createTimeWindowEvaluator(now);
    const notification = makeNotification();
    const config: ConditionConfig = { operator: 'within', value: '09:00-17:00' };
    expect(evaluator.evaluate(notification, config)).toBe(false);
  });

  it('handles overnight windows (e.g., 22:00-06:00)', () => {
    // 23:00 (within overnight window)
    const now = new Date('2024-01-15T23:00:00');
    const evaluator = createTimeWindowEvaluator(now);
    const notification = makeNotification();
    const config: ConditionConfig = { operator: 'within', value: '22:00-06:00' };
    expect(evaluator.evaluate(notification, config)).toBe(true);
  });

  it('handles overnight windows - early morning', () => {
    // 03:00 (within overnight window)
    const now = new Date('2024-01-15T03:00:00');
    const evaluator = createTimeWindowEvaluator(now);
    const notification = makeNotification();
    const config: ConditionConfig = { operator: 'within', value: '22:00-06:00' };
    expect(evaluator.evaluate(notification, config)).toBe(true);
  });

  it('supports outside operator', () => {
    // 20:00 (outside 09:00-17:00)
    const now = new Date('2024-01-15T20:00:00');
    const evaluator = createTimeWindowEvaluator(now);
    const notification = makeNotification();
    const config: ConditionConfig = { operator: 'outside', value: '09:00-17:00' };
    expect(evaluator.evaluate(notification, config)).toBe(true);
  });

  it('returns false for invalid time format', () => {
    const now = new Date('2024-01-15T10:00:00');
    const evaluator = createTimeWindowEvaluator(now);
    const notification = makeNotification();
    const config: ConditionConfig = { operator: 'within', value: 'invalid' };
    expect(evaluator.evaluate(notification, config)).toBe(false);
  });

  it('returns false for invalid hour values', () => {
    const now = new Date('2024-01-15T10:00:00');
    const evaluator = createTimeWindowEvaluator(now);
    const notification = makeNotification();
    const config: ConditionConfig = { operator: 'within', value: '25:00-17:00' };
    expect(evaluator.evaluate(notification, config)).toBe(false);
  });
});

describe('evaluateConditions - AND/OR logic', () => {
  it('returns true when no conditions are provided', () => {
    const notification = makeNotification();
    expect(evaluateConditions([], notification)).toBe(true);
  });

  it('evaluates a single condition', () => {
    const notification = makeNotification({ content: 'urgent alert' });
    const conditions: RuleCondition[] = [
      makeCondition({ type: 'contains', config: { operator: 'contains', value: 'urgent', field: 'content' }, orderIndex: 0 }),
    ];
    expect(evaluateConditions(conditions, notification)).toBe(true);
  });

  it('AND logic: all conditions must be true', () => {
    const notification = makeNotification({ content: 'urgent meeting', priority: 5 });
    const conditions: RuleCondition[] = [
      makeCondition({ id: 'c1', type: 'contains', config: { operator: 'contains', value: 'urgent', field: 'content' }, logicOperator: 'AND', orderIndex: 0 }),
      makeCondition({ id: 'c2', type: 'priority', config: { operator: '>=', value: '3' }, logicOperator: 'AND', orderIndex: 1 }),
    ];
    expect(evaluateConditions(conditions, notification)).toBe(true);
  });

  it('AND logic: returns false if any condition is false', () => {
    const notification = makeNotification({ content: 'urgent meeting', priority: 1 });
    const conditions: RuleCondition[] = [
      makeCondition({ id: 'c1', type: 'contains', config: { operator: 'contains', value: 'urgent', field: 'content' }, logicOperator: 'AND', orderIndex: 0 }),
      makeCondition({ id: 'c2', type: 'priority', config: { operator: '>=', value: '3' }, logicOperator: 'AND', orderIndex: 1 }),
    ];
    expect(evaluateConditions(conditions, notification)).toBe(false);
  });

  it('OR logic: returns true if at least one condition is true', () => {
    const notification = makeNotification({ content: 'hello world', priority: 5 });
    const conditions: RuleCondition[] = [
      makeCondition({ id: 'c1', type: 'contains', config: { operator: 'contains', value: 'urgent', field: 'content' }, logicOperator: 'AND', orderIndex: 0 }),
      makeCondition({ id: 'c2', type: 'priority', config: { operator: '>=', value: '3' }, logicOperator: 'OR', orderIndex: 1 }),
    ];
    expect(evaluateConditions(conditions, notification)).toBe(true);
  });

  it('OR logic: returns false if all conditions are false', () => {
    const notification = makeNotification({ content: 'hello world', priority: 1 });
    const conditions: RuleCondition[] = [
      makeCondition({ id: 'c1', type: 'contains', config: { operator: 'contains', value: 'urgent', field: 'content' }, logicOperator: 'AND', orderIndex: 0 }),
      makeCondition({ id: 'c2', type: 'priority', config: { operator: '>=', value: '3' }, logicOperator: 'OR', orderIndex: 1 }),
    ];
    expect(evaluateConditions(conditions, notification)).toBe(false);
  });

  it('respects orderIndex for evaluation order', () => {
    const notification = makeNotification({ content: 'hello', priority: 5 });
    // Out of order — should be sorted by orderIndex
    const conditions: RuleCondition[] = [
      makeCondition({ id: 'c2', type: 'priority', config: { operator: '>=', value: '3' }, logicOperator: 'OR', orderIndex: 1 }),
      makeCondition({ id: 'c1', type: 'contains', config: { operator: 'contains', value: 'urgent', field: 'content' }, logicOperator: 'AND', orderIndex: 0 }),
    ];
    // After sorting: c1 (contains 'urgent' → false), OR c2 (priority >= 3 → true) = true
    expect(evaluateConditions(conditions, notification)).toBe(true);
  });

  it('handles mixed AND/OR operators', () => {
    const notification = makeNotification({ content: 'urgent meeting alert', priority: 5 }) as any;
    notification.category = 'work';
    const conditions: RuleCondition[] = [
      makeCondition({ id: 'c1', type: 'contains', config: { operator: 'contains', value: 'urgent', field: 'content' }, logicOperator: 'AND', orderIndex: 0 }),
      makeCondition({ id: 'c2', type: 'category', config: { operator: 'equals', value: 'work' }, logicOperator: 'AND', orderIndex: 1 }),
      makeCondition({ id: 'c3', type: 'priority', config: { operator: '>=', value: '10' }, logicOperator: 'OR', orderIndex: 2 }),
    ];
    // c1: true, AND c2: true → true, OR c3: false → true
    expect(evaluateConditions(conditions, notification)).toBe(true);
  });
});
