import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ConditionConfig, ConditionEvaluator } from './types';

/**
 * Priority condition evaluator.
 * Checks if the notification's priority meets the specified threshold.
 *
 * Config:
 * - value: the threshold priority value (as string, will be parsed to number)
 * - operator: comparison operator — '>=', '<=', '==', '>', '<', '!=' (defaults to '>=')
 *
 * If the value cannot be parsed as a number, the condition evaluates to false.
 */
export const priorityEvaluator: ConditionEvaluator = {
  evaluate(notification: ParsedNotification, config: ConditionConfig): boolean {
    const threshold = Number(config.value);

    if (!Number.isFinite(threshold)) return false;

    const priority = notification.priority;
    const operator = config.operator || '>=';

    switch (operator) {
      case '>=':
        return priority >= threshold;
      case '<=':
        return priority <= threshold;
      case '==':
        return priority === threshold;
      case '>':
        return priority > threshold;
      case '<':
        return priority < threshold;
      case '!=':
        return priority !== threshold;
      default:
        return priority >= threshold;
    }
  },
};
