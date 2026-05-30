import { db } from '../../../database/index';
import { ruleExecutionRepository, ruleRepository } from '../../../database/repositories';
import { ruleActions, ruleConditions } from '../../../database/schema';
import type { ExecutionStatus } from '../../../database/schema/rule-executions';
import type { TriggerType } from '../../../database/schema/rules';
import type { Unsubscribe } from '../../../services/event-bus';
import { AppEvents, eventBus } from '../../../services/event-bus';
import type { ParsedNotification } from '../../../services/notification/parser';
import { logRuleEvalMetrics } from '../../../services/performance';
import type { ActionType, RuleAction } from './actions';
import { executeActions } from './actions';
import type { RuleCondition } from './conditions';
import { evaluateConditions } from './conditions';
import { getTriggerHandler } from './triggers';

/**
 * Result of evaluating and executing a single rule against a notification.
 */
export interface RuleExecutionResult {
  ruleId: string;
  notificationId: string;
  status: ExecutionStatus;
  actionsExecuted: { type: ActionType; success: boolean; error?: string }[];
  durationMs: number;
  executedAt: Date;
}

/**
 * IRuleEngine interface as defined in the design document.
 */
export interface IRuleEngine {
  evaluate(notification: ParsedNotification): Promise<RuleExecutionResult[]>;
  start(): void;
  stop(): void;
}

/**
 * Cached rule data to avoid repeated DB queries during evaluation.
 * Conditions and actions are pre-loaded and parsed once, then reused
 * until the cache is invalidated.
 */
interface CachedRule {
  id: string;
  name: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
}

/** Cache TTL in milliseconds — rules are re-fetched after this period */
const RULE_CACHE_TTL_MS = 1000 * 60 * 30;

/**
 * Rule evaluation engine.
 *
 * Subscribes to "notification:classified" events and evaluates all active rules
 * against each notification. For matching rules, executes actions in sequence
 * and logs execution results.
 *
 * Performance optimizations:
 * - Caches active rules with conditions/actions to avoid repeated DB queries
 * - Pre-parses JSON configs at cache time, not evaluation time
 * - Evaluates triggers synchronously (no DB access needed)
 * - Logs performance metrics and warns when exceeding 50ms target
 *
 * Design goals:
 * - Complete evaluation within 50ms for up to 100 active rules
 * - Handle action failures gracefully (continue remaining, mark as 'partial')
 * - Log complete execution history for every matched rule
 */
class RuleEngine implements IRuleEngine {
  private unsubscribe: Unsubscribe | null = null;
  private ruleCache: CachedRule[] | null = null;
  private ruleCacheTimestamp = 0;
  private cacheInvalidationUnsub: Unsubscribe | null = null;

  /**
   * Start listening for classified notifications on the event bus.
   */
  start(): void {
    if (this.unsubscribe) {
      console.warn('[RuleEngine] Already started. Call stop() first.');
      return;
    }

    this.unsubscribe = eventBus.on<ParsedNotification>(
      AppEvents.NOTIFICATION_CLASSIFIED,
      (notification) => {
        // Fire-and-forget evaluation; errors are logged internally
        this.evaluate(notification).catch((error) => {
          console.error('[RuleEngine] Unhandled evaluation error:', error);
        });
      }
    );

    // Invalidate cache when rules are modified
    this.cacheInvalidationUnsub = eventBus.on(
      AppEvents.RULE_UPDATED,
      () => { this.invalidateCache(); }
    );

    console.log('[RuleEngine] Started — listening for notification:classified events');
  }

  /**
   * Stop listening for events and clear the cache.
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.cacheInvalidationUnsub) {
      this.cacheInvalidationUnsub();
      this.cacheInvalidationUnsub = null;
    }
    this.invalidateCache();
    console.log('[RuleEngine] Stopped');
  }

  /**
   * Invalidate the rule cache, forcing a fresh load on next evaluation.
   * Call this when rules are created, updated, or deleted.
   */
  invalidateCache(): void {
    this.ruleCache = null;
    this.ruleCacheTimestamp = 0;
  }

  /**
   * Load and cache all active rules with their conditions and actions pre-parsed.
   * Uses a TTL to periodically refresh without requiring explicit invalidation.
   */
  private async loadRulesWithCache(): Promise<CachedRule[]> {
    const now = Date.now();

    // Return cached rules if still valid
    if (this.ruleCache && (now - this.ruleCacheTimestamp) < RULE_CACHE_TTL_MS) {
      return this.ruleCache;
    }

    // Fetch active rules
    const activeRules = await ruleRepository.findActive();

    if (activeRules.length === 0) {
      this.ruleCache = [];
      this.ruleCacheTimestamp = now;
      return this.ruleCache;
    }

    // Batch-load all conditions and actions for active rules in two queries
    // instead of 2N queries (one per rule for conditions + one for actions)
    const ruleIds: string[] = activeRules.map((r: { id: string }) => r.id);

    const [allConditions, allActions] = await Promise.all([
      this.batchLoadConditions(ruleIds),
      this.batchLoadActions(ruleIds),
    ]);

    // Build cached rules with pre-parsed JSON
    this.ruleCache = activeRules.map((rule: typeof activeRules[number]) => {
      let triggerConfig: Record<string, unknown>;
      try {
        triggerConfig = JSON.parse(rule.triggerConfig);
      } catch {
        triggerConfig = {};
      }

      const conditions: RuleCondition[] = (allConditions.get(rule.id) ?? []).map((row) => {
        let config;
        try {
          config = JSON.parse(row.config);
        } catch {
          config = { operator: '', value: '' };
        }
        return {
          id: row.id,
          ruleId: row.ruleId,
          type: row.type,
          config,
          logicOperator: (row.logicOperator ?? 'AND') as 'AND' | 'OR',
          orderIndex: row.orderIndex ?? 0,
        };
      });

      const actions: RuleAction[] = (allActions.get(rule.id) ?? []).map((row) => {
        let config;
        try {
          config = JSON.parse(row.config);
        } catch {
          config = {};
        }
        return {
          id: row.id,
          ruleId: row.ruleId,
          type: row.type as ActionType,
          config,
          orderIndex: row.orderIndex ?? 0,
        };
      });

      return {
        id: rule.id,
        name: rule.name,
        triggerType: rule.triggerType,
        triggerConfig,
        conditions,
        actions,
        priority: rule.priority ?? 0,
      };
    });

    this.ruleCacheTimestamp = now;
    return this.ruleCache!;
  }

  /**
   * Batch-load conditions for multiple rules in a single query.
   * Returns a Map of ruleId → condition rows.
   */
  private async batchLoadConditions(
    ruleIds: string[]
  ): Promise<Map<string, Array<typeof ruleConditions.$inferSelect>>> {
    const map = new Map<string, Array<typeof ruleConditions.$inferSelect>>();

    if (ruleIds.length === 0) return map;

    // Load all conditions once, then filter in-memory for compatibility with
    // lightweight test doubles and simple query builders.
    const rows = await db.select().from(ruleConditions);
    const filteredRows = rows.filter((row) => ruleIds.includes(row.ruleId));

    for (const row of filteredRows) {
      const existing = map.get(row.ruleId);
      if (existing) {
        existing.push(row);
      } else {
        map.set(row.ruleId, [row]);
      }
    }

    return map;
  }

  /**
   * Batch-load actions for multiple rules in a single query.
   * Returns a Map of ruleId → action rows.
   */
  private async batchLoadActions(
    ruleIds: string[]
  ): Promise<Map<string, Array<typeof ruleActions.$inferSelect>>> {
    const map = new Map<string, Array<typeof ruleActions.$inferSelect>>();

    if (ruleIds.length === 0) return map;

    // Load all actions once, then filter in-memory for compatibility with
    // lightweight test doubles and simple query builders.
    const rows = await db.select().from(ruleActions);
    const filteredRows = rows.filter((row) => ruleIds.includes(row.ruleId));

    for (const row of filteredRows) {
      const existing = map.get(row.ruleId);
      if (existing) {
        existing.push(row);
      } else {
        map.set(row.ruleId, [row]);
      }
    }

    return map;
  }

  /**
   * Evaluate all active rules against a notification.
   *
   * Optimized flow:
   * 1. Load rules from cache (avoids repeated DB queries)
   * 2. For each rule, check trigger match (synchronous, no DB)
   * 3. If trigger matches, evaluate pre-loaded conditions (synchronous)
   * 4. If conditions pass, execute pre-loaded actions
   * 5. Log execution result to rule_executions table
   * 6. Emit "rule:executed" event for each execution
   *
   * Performance target: <50ms for up to 100 active rules.
   */
  async evaluate(notification: ParsedNotification): Promise<RuleExecutionResult[]> {
    const overallStart = performance.now();
    const results: RuleExecutionResult[] = [];

    try {
      // 1. Load rules from cache (single DB hit if cache is warm)
      const cachedRules = await this.loadRulesWithCache();

      if (cachedRules.length === 0) {
        return results;
      }

      // 2. Evaluate each rule
      for (const rule of cachedRules) {
        const ruleStart = performance.now();

        // 2a. Check trigger match (synchronous — no DB access)
        const triggerHandler = getTriggerHandler(rule.triggerType as TriggerType);
        if (!triggerHandler) {
          continue;
        }

        const triggerMatches = triggerHandler.evaluate(notification, rule.triggerConfig);
        if (!triggerMatches) {
          continue;
        }

        // 2b. Evaluate pre-loaded conditions (synchronous — no DB access)
        const conditionsPass = evaluateConditions(rule.conditions, notification);
        if (!conditionsPass) {
          continue;
        }

        // 2c. Execute pre-loaded actions
        const actionResults = await executeActions(rule.actions, notification);

        // 2d. Determine execution status
        const ruleDuration = performance.now() - ruleStart;
        const executedAt = new Date();

        const actionsExecuted = rule.actions
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((action, index) => ({
            type: action.type,
            success: actionResults[index]?.success ?? false,
            ...(actionResults[index]?.error ? { error: actionResults[index].error } : {}),
          }));

        const allSucceeded = actionsExecuted.every((a) => a.success);
        const allFailed = actionsExecuted.length > 0 && actionsExecuted.every((a) => !a.success);

        let status: ExecutionStatus;
        if (actionsExecuted.length === 0) {
          status = 'success'; // No actions = vacuously successful
        } else if (allSucceeded) {
          status = 'success';
        } else if (allFailed) {
          status = 'failed';
        } else {
          status = 'partial';
        }

        const result: RuleExecutionResult = {
          ruleId: rule.id,
          notificationId: notification.id,
          status,
          actionsExecuted,
          durationMs: Math.round(ruleDuration),
          executedAt,
        };

        results.push(result);

        // 2e. Persist execution record (async, non-blocking for next rule)
        const errorDetails = actionsExecuted
          .filter((a) => !a.success && a.error)
          .map((a) => `${a.type}: ${a.error}`)
          .join('; ');

        try {
          await ruleExecutionRepository.create({
            ruleId: rule.id,
            notificationId: notification.id,
            status,
            actionsExecuted: JSON.stringify(actionsExecuted),
            errorDetails: errorDetails || null,
            durationMs: Math.round(ruleDuration),
            executedAt,
          });
        } catch (error) {
          console.error(`[RuleEngine] Failed to persist execution for rule ${rule.id}:`, error);
        }

        // 2f. Emit rule:executed event
        eventBus.emit(AppEvents.RULE_EXECUTED, result);
      }
    } catch (error) {
      console.error('[RuleEngine] Evaluation error:', error);
    }

    const totalDuration = performance.now() - overallStart;

    // Log performance metrics
    logRuleEvalMetrics({
      ruleCount: this.ruleCache?.length ?? 0,
      matchedCount: results.length,
      totalMs: Math.round(totalDuration * 100) / 100,
      perRuleAvgMs: this.ruleCache?.length
        ? Math.round((totalDuration / this.ruleCache.length) * 100) / 100
        : 0,
    });

    return results;
  }
}

/** Singleton rule engine instance */
export const ruleEngine = new RuleEngine();
