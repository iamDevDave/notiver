import { eq } from 'drizzle-orm';
import { db } from '../index';
import { aiPredictions } from '../schema';
import { BaseRepository } from './base.repository';

type AIPrediction = typeof aiPredictions.$inferSelect;
type NewAIPrediction = Omit<AIPrediction, 'id' | 'createdAt'>;

/**
 * Repository for AI prediction records.
 * Provides queries by notification ID.
 */
export class AIPredictionRepository extends BaseRepository<AIPrediction> {
  constructor() {
    super(aiPredictions);
  }

  override async create(entity: NewAIPrediction): Promise<AIPrediction> {
    const now = new Date();
    const id = this.generateId();
    const record: AIPrediction = {
      ...entity,
      id,
      createdAt: now,
    } as AIPrediction;

    await db.insert(aiPredictions).values(record);
    return record;
  }

  async findByNotification(notificationId: string): Promise<AIPrediction[]> {
    return await db
      .select()
      .from(aiPredictions)
      .where(eq(aiPredictions.notificationId, notificationId));
  }
}
