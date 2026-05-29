import { eq, desc } from 'drizzle-orm';
import { db } from '../index';
import { rules, type TriggerType } from '../schema';
import { BaseRepository } from './base.repository';

type Rule = typeof rules.$inferSelect;
type NewRule = Omit<Rule, 'id' | 'createdAt'>;

/**
 * Repository for rule entities.
 * Provides queries for active rules and trigger-type filtering.
 */
export class RuleRepository extends BaseRepository<Rule> {
  constructor() {
    super(rules);
  }

  override async create(entity: NewRule): Promise<Rule> {
    const now = new Date();
    const id = this.generateId();
    const record: Rule = {
      ...entity,
      id,
      createdAt: now,
      updatedAt: now,
    } as Rule;

    await db.insert(rules).values(record);
    return record;
  }

  override async update(id: string, partial: Partial<Rule>): Promise<Rule> {
    const updateData = { ...partial, updatedAt: new Date() } as any;
    delete updateData.id;
    delete updateData.createdAt;

    await db.update(rules).set(updateData).where(eq(rules.id, id));

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Rule with id ${id} not found after update`);
    }
    return updated;
  }

  async findActive(): Promise<Rule[]> {
    return await db
      .select()
      .from(rules)
      .where(eq(rules.isActive, true))
      .orderBy(desc(rules.priority));
  }

  async findByTriggerType(triggerType: TriggerType): Promise<Rule[]> {
    return await db
      .select()
      .from(rules)
      .where(eq(rules.triggerType, triggerType));
  }
}
