import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { DATABASE_NAME } from '../core/constants';
import { runMigrations } from './migrations';
import * as schema from './schema';

const expoDb = openDatabaseSync(DATABASE_NAME);

/**
 * DEVELOPMENT ONLY
 * Delete corrupted old database tables, but only once per JS VM.
 * Repeated drops during Fast Refresh lead to race conditions and
 * "entity not found after update" errors. Guard with a global flag
 * so the reset runs only on the first module evaluation.
 */
if (__DEV__) {
  // Use a non-enumerable property on globalThis to avoid collisions.
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - augmenting globalThis for a dev-time guard
    if (!globalThis.__notiver_db_reset_done) {
      expoDb.execSync(`
        DROP TABLE IF EXISTS notifications;
        DROP TABLE IF EXISTS rules;
        DROP TABLE IF EXISTS rule_conditions;
        DROP TABLE IF EXISTS rule_actions;
        DROP TABLE IF EXISTS rule_executions;
        DROP TABLE IF EXISTS analytics;
        DROP TABLE IF EXISTS focus_sessions;
        DROP TABLE IF EXISTS settings;
        DROP TABLE IF EXISTS ai_predictions;
        DROP TABLE IF EXISTS _migrations;
      `);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      globalThis.__notiver_db_reset_done = true;
      console.log('DATABASE RESET COMPLETE');
    }
  } catch (error) {
    console.error('DATABASE RESET FAILED', error);
  }
}

runMigrations(expoDb);

export const db = drizzle(expoDb, { schema });

export { expoDb };

export async function initializeDatabase(): Promise<void> {
  const { runSeed } = await import('./seed');
  await runSeed();
}