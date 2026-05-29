import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ConditionEvaluator, ConditionType, RuleCondition } from './types';
import { containsEvaluator } from './contains';
import { notContainsEvaluator } from './not-contains';
import { regexEvaluator } from './regex';
import { categoryEvaluator } from './category';
import { priorityEvaluator } from './priority';
import { timeWindowEvaluator } from './time-window';

export type { ConditionEvaluator, ConditionConfig, ConditionType, RuleCondition } from './types';

/**
 * Registry mapping condition types to their evaluator implementations.
 */
const conditionRegistry: Record<ConditionType, ConditionEvaluator> = {
  contains: containsEvaluator,
  not_contains: notContainsEvaluator,
  regex: regexEvaluator,
  category: categoryEvaluator,
  priority: priorityEvaluator,
  time_window: timeWindowEvaluator,
};

/**
 * Retrieves the evaluator for a given condition type.
 * Returns undefined if the condition type is not registered.
 */
export function getConditionEvaluator(type: ConditionType): ConditionEvaluator | undefined {
  return conditionRegistry[type];
}

/**
 * Registers a custom condition evaluator for a given type.
 * Useful for testing or extending the condition system.
 */
export function registerConditionEvaluator(type: ConditionType, evaluator: ConditionEvaluator): void {
  conditionRegistry[type] = evaluator;
}

/**
 * Evaluates an array of rule conditions against a notification using AND/OR logic.
 *
 * Logic evaluation rules:
 * - Conditions are sorted by orderIndex before evaluation
 * - The logicOperator on each condition defines how it combines with the PREVIOUS result
 * - The first condition's result is used as the initial value
 * - AND: requires both the accumulated result and current condition to be true
 * - OR: requires at least one of the accumulated result or current condition to be true
 *
 * If no conditions are provided, returns true (no conditions = always matches).
 * If a condition type has no registered evaluator, that condition evaluates to false.
 */
export function evaluateConditions(
  conditions: RuleCondition[],
  notification: ParsedNotification
): boolean {
  if (conditions.length === 0) return true;

  // Sort conditions by orderIndex
  const sorted = [...conditions].sort((a, b) => a.orderIndex - b.orderIndex);

  // Evaluate the first condition
  const firstCondition = sorted[0];
  const firstEvaluator = getConditionEvaluator(firstCondition.type);
  let result = firstEvaluator
    ? firstEvaluator.evaluate(notification, firstCondition.config)
    : false;

  // Evaluate remaining conditions with logic operators
  for (let i = 1; i < sorted.length; i++) {
    const condition = sorted[i];
    const evaluator = getConditionEvaluator(condition.type);
    const conditionResult = evaluator
      ? evaluator.evaluate(notification, condition.config)
      : false;

    if (condition.logicOperator === 'OR') {
      result = result || conditionResult;
    } else {
      // Default to AND
      result = result && conditionResult;
    }
  }

  return result;
}
