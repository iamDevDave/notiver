import type { ParsedNotification } from '../../../../services/notification/parser';

/**
 * Result of executing a single action.
 */
export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Interface that all action executors must implement.
 * Each executor performs a specific action on a notification.
 */
export interface ActionExecutor {
  execute(notification: ParsedNotification, config: Record<string, unknown>): Promise<ActionResult>;
}

/**
 * A rule action as stored in the database, with parsed config.
 */
export interface RuleAction {
  id: string;
  ruleId: string;
  type: ActionType;
  config: Record<string, unknown>;
  orderIndex: number;
}

export type ActionType =
  | 'dismiss'
  | 'delay'
  | 'alarm'
  | 'vibrate'
  | 'reply'
  | 'launch_app'
  | 'batch'
  | 'webhook'
  | 'copy'
  | 'speak'
  | 'click'
  | 'expand';
