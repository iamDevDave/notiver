import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { DATABASE_NAME } from '../core/constants';
import { runMigrations } from './migrations';
import * as schema from './schema';

const expoDb = openDatabaseSync(DATABASE_NAME);

// Run migrations on database open to ensure schema is up to date.
// This is safe to call multiple times — already-applied migrations are skipped.
runMigrations(expoDb);

export const db = drizzle(expoDb, { schema });

/** Expose the raw expo-sqlite instance for direct SQL access when needed */
export { expoDb };

/**
 * Initializes the database by running seed data on first creation.
 * This must be called after the module is loaded (async) since seeding
 * uses the Drizzle ORM which requires the db export to be available.
 *
 * Safe to call multiple times — seeding is skipped if already applied.
 */
export async function initializeDatabase(): Promise<void> {
  const { runSeed } = await import('./seed');
  await runSeed();
}
