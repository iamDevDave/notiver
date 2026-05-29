import { eq } from 'drizzle-orm';
import { db } from '../index';
import { settings } from '../schema';

type Setting = typeof settings.$inferSelect;

/**
 * Repository for key-value settings.
 * Provides get/set/getAll operations for application configuration.
 */
export class SettingsRepository {
  async get(key: string): Promise<string | null> {
    const results = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key));

    return results[0]?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key));

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({
        key,
        value,
        updatedAt: new Date(),
      });
    }
  }

  async getAll(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async delete(key: string): Promise<void> {
    await db.delete(settings).where(eq(settings.key, key));
  }
}
