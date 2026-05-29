import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ConditionConfig, ConditionEvaluator } from './types';
import { getFieldValue } from './contains';

/**
 * Regex condition evaluator.
 * Checks if the specified notification field matches the given regex pattern.
 *
 * Config:
 * - value: the regex pattern string
 * - field: notification field to check (defaults to 'content')
 * - operator: optional flags (e.g., 'i' for case-insensitive). Defaults to 'i'.
 *
 * If the regex pattern is invalid, the condition evaluates to false.
 */
export const regexEvaluator: ConditionEvaluator = {
  evaluate(notification: ParsedNotification, config: ConditionConfig): boolean {
    const fieldValue = getFieldValue(notification, config.field);
    const pattern = config.value || '';

    if (pattern === '') return true;

    try {
      const flags = config.operator || 'i';
      const regex = new RegExp(pattern, flags);
      return regex.test(fieldValue);
    } catch {
      // Invalid regex pattern — condition fails
      return false;
    }
  },
};
