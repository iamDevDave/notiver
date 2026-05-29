import { eq, desc } from 'drizzle-orm';
import { db } from '../index';
import { ruleExecutions } from '../schema';
import { BaseRepository } from './base.repository';
import type { QueryOptions } from '../../core/base';

type RuleExecution = typeof ruleExecutions.$inferSelect;
type NewRuleExecution = Omit<RuleExecution, 'id'>;

/**
 * Repository for rule execution records.
 * Provides queries by rule and by notification.
 */
export class RuleExecutionRepository extends BaseRepository<RuleExecution> {
  constructor() {
    super(ruleExecutions);
  }

  override async create(entity: NewRuleExecution): Promise<RuleExecution> {
    const id = this.generateId();
    const record: RuleExecution = {
      ...entity,
      id,
    } as RuleExecution;

    await db.insert(ruleExecutions).values(record);
    return record;
  }

  async findByRule(ruleId: string, options?: QueryOptions): Promise<RuleExecution[]> {
    let query = db
      .select()
      .from(ruleExecutions)
      .where(eq(ruleExecutions.ruleId, ruleId))
      .orderBy(desc(ruleExecutions.executedAt))
      .$dynamic();

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }

  async findByNotification(
    notificationId: string,
    options?: QueryOptions
  ): Promise<RuleExecution[]> {
    let query = db
      .select()
      .from(ruleExecutions)
      .where(eq(ruleExecutions.notificationId, notificationId))
      .orderBy(desc(ruleExecutions.executedAt))
      .$dynamic();

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }
}
