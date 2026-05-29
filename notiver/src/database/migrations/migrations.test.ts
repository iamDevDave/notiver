import { runMigrations, getMigrationStatus } from './index';
import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Creates a mock SQLiteDatabase that simulates an in-memory migration tracking table.
 * This allows us to test the migration runner logic without a real SQLite instance.
 */
function createMockDb() {
  const appliedMigrations: Array<{ id: string; name: string; applied_at: number }> = [];
  const executedStatements: string[] = [];
  let inTransaction = false;
  let shouldRollback = false;

  const mockDb = {
    execSync: jest.fn((sql: string) => {
      executedStatements.push(sql.trim());
      if (sql.includes('BEGIN TRANSACTION')) {
        inTransaction = true;
      } else if (sql.includes('COMMIT')) {
        inTransaction = false;
      } else if (sql.includes('ROLLBACK')) {
        inTransaction = false;
        shouldRollback = true;
      }
    }),
    getAllSync: jest.fn(<T>(_sql: string): T[] => {
      // Return applied migrations when queried
      return appliedMigrations.map((m) => ({ id: m.id })) as unknown as T[];
    }),
    runSync: jest.fn((_sql: string, ...args: unknown[]) => {
      if (_sql.includes('INSERT INTO _migrations')) {
        appliedMigrations.push({
          id: args[0] as string,
          name: args[1] as string,
          applied_at: args[2] as number,
        });
      }
    }),
  } as unknown as SQLiteDatabase;

  return {
    db: mockDb,
    getExecutedStatements: () => executedStatements,
    getAppliedMigrations: () => appliedMigrations,
    wasInTransaction: () => inTransaction,
  };
}

describe('Database Migrations', () => {
  describe('runMigrations', () => {
    it('should create the _migrations tracking table', () => {
      const { db, getExecutedStatements } = createMockDb();

      runMigrations(db);

      const statements = getExecutedStatements();
      const createMigrationsTable = statements.find((s) =>
        s.includes('CREATE TABLE IF NOT EXISTS _migrations')
      );
      expect(createMigrationsTable).toBeDefined();
    });

    it('should apply the initial migration on first run', () => {
      const { db, getAppliedMigrations } = createMockDb();

      const count = runMigrations(db);

      expect(count).toBe(2);
      expect(getAppliedMigrations()).toHaveLength(2);
      expect(getAppliedMigrations()[0].id).toBe('001_initial_schema');
      expect(getAppliedMigrations()[1].id).toBe('002_performance_indexes');
    });

    it('should not re-apply already applied migrations', () => {
      const { db } = createMockDb();

      // First run applies both migrations
      const firstCount = runMigrations(db);
      expect(firstCount).toBe(2);

      // Second run should skip them
      const secondCount = runMigrations(db);
      expect(secondCount).toBe(0);
    });

    it('should wrap each migration in a transaction', () => {
      const { db, getExecutedStatements } = createMockDb();

      runMigrations(db);

      const statements = getExecutedStatements();
      const beginIdx = statements.findIndex((s) => s.includes('BEGIN TRANSACTION'));
      const commitIdx = statements.findIndex((s) => s.includes('COMMIT'));

      expect(beginIdx).toBeGreaterThan(-1);
      expect(commitIdx).toBeGreaterThan(beginIdx);
    });

    it('should rollback on migration failure', () => {
      const { db, getExecutedStatements } = createMockDb();

      // Make execSync throw on a specific call (after BEGIN TRANSACTION)
      let callCount = 0;
      (db.execSync as jest.Mock).mockImplementation((sql: string) => {
        callCount++;
        // Let _migrations table creation and BEGIN pass, then fail
        if (callCount === 3) {
          throw new Error('Simulated SQL error');
        }
      });

      expect(() => runMigrations(db)).toThrow('Migration "001_initial_schema" failed');

      const statements = (db.execSync as jest.Mock).mock.calls.map(
        (call: unknown[]) => (call[0] as string).trim()
      );
      const rollbackCalled = statements.some((s: string) => s.includes('ROLLBACK'));
      expect(rollbackCalled).toBe(true);
    });

    it('should create all required tables in initial migration', () => {
      const { db, getExecutedStatements } = createMockDb();

      runMigrations(db);

      const statements = getExecutedStatements();
      const tableNames = [
        'notifications',
        'rules',
        'rule_conditions',
        'rule_actions',
        'rule_executions',
        'analytics',
        'focus_sessions',
        'settings',
        'ai_predictions',
      ];

      for (const table of tableNames) {
        const hasTable = statements.some(
          (s) => s.includes(`CREATE TABLE IF NOT EXISTS ${table}`)
        );
        expect(hasTable).toBe(true);
      }
    });

    it('should create all required indexes in initial migration', () => {
      const { db, getExecutedStatements } = createMockDb();

      runMigrations(db);

      const statements = getExecutedStatements();
      const indexNames = [
        // From 001_initial_schema
        'idx_notifications_category',
        'idx_notifications_package',
        'idx_notifications_received_at',
        'idx_notifications_app_category',
        'idx_executions_rule',
        'idx_executions_executed_at',
        'idx_analytics_date',
        'idx_analytics_date_hour',
        'idx_predictions_notification',
        // From 002_performance_indexes
        'idx_rules_active_priority',
        'idx_rules_trigger_type',
        'idx_rule_conditions_rule_id',
        'idx_rule_actions_rule_id',
        'idx_notifications_is_read',
        'idx_notifications_archived_received',
      ];

      for (const idx of indexNames) {
        const hasIndex = statements.some(
          (s) => s.includes(`CREATE INDEX IF NOT EXISTS ${idx}`)
        );
        expect(hasIndex).toBe(true);
      }
    });
  });

  describe('getMigrationStatus', () => {
    it('should report unapplied migrations before running', () => {
      const { db } = createMockDb();

      const status = getMigrationStatus(db);

      expect(status).toHaveLength(2);
      expect(status[0]).toEqual({
        id: '001_initial_schema',
        name: 'Create initial database schema',
        applied: false,
      });
      expect(status[1]).toEqual({
        id: '002_performance_indexes',
        name: 'Add performance optimization indexes',
        applied: false,
      });
    });

    it('should report applied migrations after running', () => {
      const { db } = createMockDb();

      runMigrations(db);
      const status = getMigrationStatus(db);

      expect(status).toHaveLength(2);
      expect(status[0].applied).toBe(true);
      expect(status[1].applied).toBe(true);
    });
  });
});
