import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ConditionConfig, ConditionEvaluator } from './types';
import { getFieldValue } from './contains';

/**
 * Not Contains condition evaluator.
 * Checks if the specified notification field does NOT contain the given value (case-insensitive).
 *
 * Config:
 * - value: the substring that should be absent
 * - field: notification field to check (defaults to 'content')
 */
export const notContainsEvaluator: ConditionEvaluator = {
  evaluate(notification: ParsedNotification, config: ConditionConfig): boolean {
    const fieldValue = getFieldValue(notification, config.field);
    const searchValue = config.value || '';

    if (searchValue === '') return true;

    return !fieldValue.toLowerCase().includes(searchValue.toLowerCase());
  },
};
