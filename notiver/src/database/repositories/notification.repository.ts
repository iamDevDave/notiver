import { eq, and, between, or, like, desc } from 'drizzle-orm';
import { db } from '../index';
import { notifications, type NotificationCategory } from '../schema';
import { BaseRepository } from './base.repository';
import type { QueryOptions } from '../../core/base';

type Notification = typeof notifications.$inferSelect;
type NewNotification = Omit<Notification, 'id' | 'createdAt'>;

/**
 * Repository for notification entities.
 * Provides app-specific, category, date range, and full-text search queries.
 */
export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super(notifications);
  }

  override async create(entity: NewNotification): Promise<Notification> {
    const now = new Date();
    const id = this.generateId();
    const record: Notification = {
      ...entity,
      id,
      createdAt: now,
    } as Notification;

    await db.insert(notifications).values(record);
    return record;
  }

  async findByApp(packageName: string, options?: QueryOptions): Promise<Notification[]> {
    let query = db
      .select()
      .from(notifications)
      .where(eq(notifications.packageName, packageName))
      .$dynamic();

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }

  async findByCategory(
    category: NotificationCategory,
    options?: QueryOptions
  ): Promise<Notification[]> {
    let query = db
      .select()
      .from(notifications)
      .where(eq(notifications.category, category))
      .$dynamic();

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }

  async findByDateRange(start: Date, end: Date): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(between(notifications.receivedAt, start, end))
      .orderBy(desc(notifications.receivedAt));
  }

  async search(query: string, options?: QueryOptions): Promise<Notification[]> {
    const pattern = `%${query}%`;

    let dbQuery = db
      .select()
      .from(notifications)
      .where(
        or(
          like(notifications.title, pattern),
          like(notifications.content, pattern),
          like(notifications.sender, pattern),
          like(notifications.appName, pattern)
        )
      )
      .$dynamic();

    if (options?.limit) {
      dbQuery = dbQuery.limit(options.limit);
    }
    if (options?.offset) {
      dbQuery = dbQuery.offset(options.offset);
    }

    return await dbQuery;
  }

  override async batchInsert(notificationList: Notification[]): Promise<void> {
    if (notificationList.length === 0) return;
    await db.insert(notifications).values(notificationList);
  }
}
