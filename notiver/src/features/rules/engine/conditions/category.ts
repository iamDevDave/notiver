import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ConditionConfig, ConditionEvaluator } from './types';

/**
 * Extended notification type that includes the category field.
 * The category is assigned by the AI classifier after parsing.
 */
interface NotificationWithCategory extends ParsedNotification {
  category?: string | null;
}

/**
 * Category condition evaluator.
 * Checks if the notification's category matches the specified value (case-insensitive).
 *
 * Config:
 * - value: the expected category (e.g., 'important', 'work', 'social', 'spam', 'promotion', 'emergency')
 * - operator: comparison type — 'equals' (default) or 'not_equals'
 *
 * If the notification has no category assigned, the condition evaluates to false.
 */
export const categoryEvaluator: ConditionEvaluator = {
  evaluate(notification: ParsedNotification, config: ConditionConfig): boolean {
    const notif = notification as NotificationWithCategory;
    const notificationCategory = (notif.category ?? '').toLowerCase();
    const expectedCategory = (config.value || '').toLowerCase();

    if (!notificationCategory) return false;

    const operator = config.operator || 'equals';

    if (operator === 'not_equals') {
      return notificationCategory !== expectedCategory;
    }

    return notificationCategory === expectedCategory;
  },
};
