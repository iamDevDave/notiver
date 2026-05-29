import type { SQLiteDatabase } from 'expo-sqlite';
import type { Migration } from './types';
import { migration001InitialSchema } from './001_initial_schema';
import { migration002PerformanceIndexes } from './002_performance_indexes';

export type { Migration } from './types';

/**
 * Registry of all migrations in order.
 * New migrations should be appended to this array.
 */
const migrations: Migration[] = [
  migration001InitialSchema,
  migration002PerformanceIndexes,
];

/**
 * Creates the internal migrations tracking table if it doesn't exist.
 */
function ensureMigrationsTable(db: SQLiteDatabase): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);
}

/**
 * Returns the set of migration IDs that have already been applied.
 */
function getAppliedMigrations(db: SQLiteDatabase): Set<string> {
  const rows = db.getAllSync<{ id: string }>('SELECT id FROM _migrations');
  return new Set(rows.map((row) => row.id));
}

/**
 * Records a migration as applied in the tracking table.
 */
function recordMigration(db: SQLiteDatabase, migration: Migration): void {
  db.runSync(
    'INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)',
    migration.id,
    migration.name,
    Date.now()
  );
}

/**
 * Runs all pending database migrations in order.
 *
 * - Creates a `_migrations` table to track which migrations have been applied
 * - Applies only migrations that haven't been run yet
 * - Wraps each migration in a transaction for atomicity
 * - Migrations are non-destructive (additive only, no data loss)
 *
 * This function should be called during app initialization before any DB queries.
 *
 * @param db - The raw expo-sqlite database instance
 * @returns The number of migrations that were applied
 */
export function runMigrations(db: SQLiteDatabase): number {
  ensureMigrationsTable(db);

  const applied = getAppliedMigrations(db);
  let appliedCount = 0;

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }

    db.execSync('BEGIN TRANSACTION;');
    try {
      migration.up(db);
      recordMigration(db, migration);
      db.execSync('COMMIT;');
      appliedCount++;
    } catch (error) {
      db.execSync('ROLLBACK;');
      throw new Error(
        `Migration "${migration.id}" failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return appliedCount;
}

/**
 * Returns the list of all registered migrations and their applied status.
 * Useful for debugging and status reporting.
 */
export function getMigrationStatus(
  db: SQLiteDatabase
): Array<{ id: string; name: string; applied: boolean }> {
  ensureMigrationsTable(db);
  const applied = getAppliedMigrations(db);

  return migrations.map((m) => ({
    id: m.id,
    name: m.name,
    applied: applied.has(m.id),
  }));
}
