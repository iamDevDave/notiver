import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ActionExecutor, ActionResult, ActionType, RuleAction } from './types';
import { dismissExecutor } from './dismiss';
import { delayExecutor } from './delay';
import { alarmExecutor } from './alarm';
import { vibrateExecutor } from './vibrate';
import { replyExecutor } from './reply';
import { launchAppExecutor } from './launch-app';
import { batchExecutor } from './batch';
import { webhookExecutor } from './webhook';
import { copyExecutor } from './copy';
import { speakExecutor } from './speak';
import { clickExecutor } from './click';
import { expandExecutor } from './expand';

export type { ActionExecutor, ActionResult, ActionType, RuleAction } from './types';
export { ACCESSIBILITY_ACTION_LOG_EVENT } from './accessibility-retry';
export type { AccessibilityActionLogEvent } from './accessibility-retry';

/**
 * Registry mapping action types to their executor implementations.
 */
const actionRegistry: Record<ActionType, ActionExecutor> = {
  dismiss: dismissExecutor,
  delay: delayExecutor,
  alarm: alarmExecutor,
  vibrate: vibrateExecutor,
  reply: replyExecutor,
  launch_app: launchAppExecutor,
  batch: batchExecutor,
  webhook: webhookExecutor,
  copy: copyExecutor,
  speak: speakExecutor,
  click: clickExecutor,
  expand: expandExecutor,
};

/**
 * Retrieves the executor for a given action type.
 * Returns undefined if the action type is not registered.
 */
export function getActionExecutor(type: ActionType): ActionExecutor | undefined {
  return actionRegistry[type];
}

/**
 * Registers a custom action executor for a given type.
 * Useful for testing or extending the action system.
 */
export function registerActionExecutor(type: ActionType, executor: ActionExecutor): void {
  actionRegistry[type] = executor;
}

/**
 * Executes an array of rule actions sequentially, respecting orderIndex.
 *
 * Execution rules:
 * - Actions are sorted by orderIndex before execution
 * - Each action is executed sequentially (awaited before the next)
 * - If one action fails, the error is logged and remaining actions still execute
 * - Returns an array of ActionResult for each action in execution order
 *
 * @param actions - Array of rule actions to execute
 * @param notification - The notification that triggered the rule
 * @returns Array of ActionResult in execution order
 */
export async function executeActions(
  actions: RuleAction[],
  notification: ParsedNotification
): Promise<ActionResult[]> {
  if (actions.length === 0) return [];

  // Sort actions by orderIndex
  const sorted = [...actions].sort((a, b) => a.orderIndex - b.orderIndex);
  const results: ActionResult[] = [];

  for (const action of sorted) {
    const executor = getActionExecutor(action.type);

    if (!executor) {
      const result: ActionResult = {
        success: false,
        error: `No executor registered for action type: ${action.type}`,
      };
      console.warn(`[Actions] ${result.error}`);
      results.push(result);
      continue;
    }

    try {
      const result = await executor.execute(notification, action.config);
      results.push(result);

      if (!result.success) {
        console.warn(`[Actions] Action "${action.type}" failed: ${result.error}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown execution error';
      const result: ActionResult = { success: false, error: message };
      console.warn(`[Actions] Action "${action.type}" threw: ${message}`);
      results.push(result);
    }
  }

  return results;
}
