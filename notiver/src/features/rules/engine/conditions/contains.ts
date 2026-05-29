import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ConditionConfig, ConditionEvaluator } from './types';

/**
 * Extracts the value of a notification field by name.
 * Supports: title, content, sender, appName, packageName.
 * Returns empty string for null fields or unknown field names.
 */
function getFieldValue(notification: ParsedNotification, field?: string): string {
  const fieldName = field || 'content';
  switch (fieldName) {
    case 'title':
      return notification.title ?? '';
    case 'content':
      return notification.content ?? '';
    case 'sender':
      return notification.sender ?? '';
    case 'appName':
      return notification.appName;
    case 'packageName':
      return notification.packageName;
    default:
      return '';
  }
}

/**
 * Contains condition evaluator.
 * Checks if the specified notification field contains the given value (case-insensitive).
 *
 * Config:
 * - value: the substring to search for
 * - field: notification field to check (defaults to 'content')
 */
export const containsEvaluator: ConditionEvaluator = {
  evaluate(notification: ParsedNotification, config: ConditionConfig): boolean {
    const fieldValue = getFieldValue(notification, config.field);
    const searchValue = config.value || '';

    if (searchValue === '') return true;

    return fieldValue.toLowerCase().includes(searchValue.toLowerCase());
  },
};

export { getFieldValue };
