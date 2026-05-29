import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { DATABASE_NAME } from '../core/constants';
import { runMigrations } from './migrations';
import * as schema from './schema';

const expoDb = openDatabaseSync(DATABASE_NAME);

/**
 * DEVELOPMENT ONLY
 * Delete corrupted old database tables.
 */
if (__DEV__) {
  try {
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

    console.log('DATABASE RESET COMPLETE');
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