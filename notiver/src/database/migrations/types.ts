import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Represents a single database migration.
 * Migrations are applied incrementally and tracked to prevent re-application.
 */
export interface Migration {
  /** Unique identifier for the migration (e.g., '001_initial_schema') */
  id: string;
  /** Human-readable name describing what the migration does */
  name: string;
  /** Applies the migration to the database. Must be non-destructive (additive only). */
  up: (db: SQLiteDatabase) => void;
}
