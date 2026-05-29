import { eq, between, or, desc } from 'drizzle-orm';
import { db } from '../index';
import { focusSessions } from '../schema';
import { BaseRepository } from './base.repository';

type FocusSession = typeof focusSessions.$inferSelect;
type NewFocusSession = Omit<FocusSession, 'id'>;

/**
 * Repository for focus session entities.
 * Provides queries for active sessions and date range filtering.
 */
export class FocusSessionRepository extends BaseRepository<FocusSession> {
  constructor() {
    super(focusSessions);
  }

  override async create(entity: NewFocusSession): Promise<FocusSession> {
    const id = this.generateId();
    const record: FocusSession = {
      ...entity,
      id,
    } as FocusSession;

    await db.insert(focusSessions).values(record);
    return record;
  }

  async findActive(): Promise<FocusSession[]> {
    return await db
      .select()
      .from(focusSessions)
      .where(
        or(
          eq(focusSessions.status, 'active'),
          eq(focusSessions.status, 'paused')
        )
      )
      .orderBy(desc(focusSessions.startedAt));
  }

  async findByDateRange(start: Date, end: Date): Promise<FocusSession[]> {
    return await db
      .select()
      .from(focusSessions)
      .where(between(focusSessions.startedAt, start, end))
      .orderBy(desc(focusSessions.startedAt));
  }
}
