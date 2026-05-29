import { eq, and, between, sql } from 'drizzle-orm';
import { db } from '../index';
import { analytics } from '../schema';
import { BaseRepository } from './base.repository';

type Analytics = typeof analytics.$inferSelect;
type NewAnalytics = Omit<Analytics, 'id'>;

/**
 * Repository for analytics records.
 * Provides date-based queries and upsert for incremental aggregation.
 */
export class AnalyticsRepository extends BaseRepository<Analytics> {
  constructor() {
    super(analytics);
  }

  override async create(entity: NewAnalytics): Promise<Analytics> {
    const id = this.generateId();
    const record: Analytics = {
      ...entity,
      id,
    } as Analytics;

    await db.insert(analytics).values(record);
    return record;
  }

  async findByDate(date: string): Promise<Analytics[]> {
    return await db
      .select()
      .from(analytics)
      .where(eq(analytics.date, date));
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Analytics[]> {
    return await db
      .select()
      .from(analytics)
      .where(between(analytics.date, startDate, endDate));
  }

  /**
   * Upsert an analytics record by date and hour.
   * If a record exists for the given date+hour, it updates the counts.
   * Otherwise, it inserts a new record.
   */
  async upsert(
    date: string,
    hour: number | null,
    data: Partial<Omit<Analytics, 'id' | 'date' | 'hour'>>
  ): Promise<Analytics> {
    const conditions = hour !== null
      ? and(eq(analytics.date, date), eq(analytics.hour, hour))
      : and(eq(analytics.date, date), sql`${analytics.hour} IS NULL`);

    const existing = await db
      .select()
      .from(analytics)
      .where(conditions!);

    if (existing.length > 0) {
      const record = existing[0];
      await db
        .update(analytics)
        .set(data as any)
        .where(eq(analytics.id, record.id));

      const updated = await this.findById(record.id);
      return updated!;
    }

    const id = this.generateId();
    const record: Analytics = {
      id,
      date,
      hour,
      notificationCount: data.notificationCount ?? 0,
      ruleTriggeredCount: data.ruleTriggeredCount ?? 0,
      focusMinutes: data.focusMinutes ?? 0,
      distractionCount: data.distractionCount ?? 0,
      topApps: data.topApps ?? null,
      categoryBreakdown: data.categoryBreakdown ?? null,
    } as Analytics;

    await db.insert(analytics).values(record);
    return record;
  }
}
