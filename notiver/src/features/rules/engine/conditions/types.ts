import type { ParsedNotification } from '../../../../services/notification/parser';

/**
 * Configuration object stored in the rule_conditions.config JSON field.
 * - operator: comparison operator (e.g., 'contains', '>=', '==')
 * - value: the value to compare against
 * - field: optional notification field to evaluate (defaults vary by condition type)
 */
export interface ConditionConfig {
  operator: string;
  value: string;
  field?: string;
}

/**
 * A rule condition as stored in the database, with parsed config.
 */
export interface RuleCondition {
  id: string;
  ruleId: string;
  type: ConditionType;
  config: ConditionConfig;
  logicOperator: 'AND' | 'OR';
  orderIndex: number;
}

export type ConditionType =
  | 'contains'
  | 'not_contains'
  | 'regex'
  | 'category'
  | 'priority'
  | 'time_window';

/**
 * Interface that all condition evaluators must implement.
 * Each evaluator checks whether a notification satisfies a specific condition.
 */
export interface ConditionEvaluator {
  evaluate(notification: ParsedNotification, config: ConditionConfig): boolean;
}
