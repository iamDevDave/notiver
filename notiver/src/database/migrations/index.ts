import type { SQLiteDatabase } from 'expo-sqlite';
import type { Migration } from './types';
import { migration001InitialSchema } from './001_initial_schema';
import { migration002PerformanceIndexes } from './002_performance_indexes';

export type { Migration } from './types';

const migrations: Migration[] = [
  migration001InitialSchema,
  migration002PerformanceIndexes,
];

function ensureMigrationsTable(db: SQLiteDatabase): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);
}

function getAppliedMigrations(db: SQLiteDatabase): Set<string> {
  const rows = db.getAllSync<{ id: string }>(
    'SELECT id FROM _migrations'
  );

  return new Set(rows.map((row) => row.id));
}

function recordMigration(
  db: SQLiteDatabase,
  migration: Migration
): void {
  db.runSync(
    'INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)',
    migration.id,
    migration.name,
    Date.now()
  );
}

export function runMigrations(
  db: SQLiteDatabase
): number {
  console.log('=== MIGRATION START ===');

  ensureMigrationsTable(db);

  try {
    const tables = db.getAllSync(
      "SELECT name FROM sqlite_master WHERE type='table';"
    );

    console.log('TABLES:', tables);
  } catch (e) {
    console.error('FAILED TO READ TABLES', e);
  }

  try {
    const notificationColumns = db.getAllSync(
      'PRAGMA table_info(notifications);'
    );

    console.log(
      'NOTIFICATIONS COLUMNS:',
      notificationColumns
    );
  } catch (e) {
    console.error(
      'FAILED TO READ NOTIFICATIONS SCHEMA',
      e
    );
  }

  const applied = getAppliedMigrations(db);

  console.log(
    'APPLIED MIGRATIONS:',
    Array.from(applied)
  );

  let appliedCount = 0;

  for (const migration of migrations) {
    console.log(`PROCESSING: ${migration.id}`);

    if (applied.has(migration.id)) {
      console.log(`SKIPPED: ${migration.id}`);
      continue;
    }

    db.execSync('BEGIN TRANSACTION;');

    try {
      console.log(`RUNNING: ${migration.id}`);

      migration.up(db);

      console.log(`SUCCESS: ${migration.id}`);

      recordMigration(db, migration);

      db.execSync('COMMIT;');

      appliedCount++;
    } catch (error) {
      console.error(
        `FAILED MIGRATION: ${migration.id}`,
        error
      );

      db.execSync('ROLLBACK;');

      throw new Error(
        `Migration "${migration.id}" failed: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );
    }
  }

  console.log('=== MIGRATION END ===');

  return appliedCount;
}

export function getMigrationStatus(
  db: SQLiteDatabase
): Array<{
  id: string;
  name: string;
  applied: boolean;
}> {
  ensureMigrationsTable(db);

  const applied = getAppliedMigrations(db);

  return migrations.map((m) => ({
    id: m.id,
    name: m.name,
    applied: applied.has(m.id),
  }));
}