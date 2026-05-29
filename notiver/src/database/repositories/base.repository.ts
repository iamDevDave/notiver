import { eq, sql, type SQL } from 'drizzle-orm';
import type { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core';
import { db } from '../index';
import type { IRepository, QueryOptions, FilterOptions } from '../../core/base';

/**
 * Abstract base repository providing common CRUD operations for all entities.
 * Subclasses must specify the table and provide ID generation.
 */
export abstract class BaseRepository<T extends Record<string, unknown>, ID = string>
  implements IRepository<T, ID>
{
  constructor(protected readonly table: SQLiteTableWithColumns<any>) {}

  protected generateId(): string {
    return crypto.randomUUID();
  }

  async findById(id: ID): Promise<T | null> {
    const results = await db
      .select()
      .from(this.table)
      .where(eq(this.table.id, id as string));
    return (results[0] as T) ?? null;
  }

  async findAll(options?: QueryOptions): Promise<T[]> {
    let query = db.select().from(this.table).$dynamic();

    if (options?.orderBy && this.table[options.orderBy]) {
      const column = this.table[options.orderBy];
      if (options.orderDirection === 'asc') {
        query = query.orderBy(column);
      } else {
        query = query.orderBy(sql`${column} DESC`);
      }
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const results = await query;
    return results as T[];
  }

  async create(entity: Omit<T, 'id' | 'createdAt'>): Promise<T> {
    const now = new Date();
    const id = this.generateId();
    const record = {
      ...entity,
      id,
      createdAt: now,
    } as unknown as T;

    await db.insert(this.table).values(record as any);
    return record;
  }

  async update(id: ID, partial: Partial<T>): Promise<T> {
    const updateData = { ...partial, updatedAt: new Date() } as any;
    delete updateData.id;
    delete updateData.createdAt;

    await db
      .update(this.table)
      .set(updateData)
      .where(eq(this.table.id, id as string));

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Entity with id ${id} not found after update`);
    }
    return updated;
  }

  async delete(id: ID): Promise<void> {
    await db.delete(this.table).where(eq(this.table.id, id as string));
  }

  async count(filter?: FilterOptions): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)` }).from(this.table).$dynamic();

    if (filter) {
      const conditions: SQL[] = [];
      for (const [key, value] of Object.entries(filter)) {
        if (this.table[key] && value !== undefined) {
          conditions.push(eq(this.table[key], value as any));
        }
      }
      if (conditions.length > 0) {
        const combined = conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`);
        query = query.where(combined);
      }
    }

    const results = await query;
    return results[0]?.count ?? 0;
  }

  async batchInsert(entities: T[]): Promise<void> {
    if (entities.length === 0) return;
    await db.insert(this.table).values(entities as any[]);
  }
}
