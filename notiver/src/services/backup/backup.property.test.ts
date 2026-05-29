/**
 * Property-Based Tests: Backup Export/Import
 *
 * **Validates: Requirements 14.3, 14.4, 14.5**
 *
 * Property 16: Export/Import Database Round-Trip
 * - For any database state containing notifications, rules, sessions, analytics, and settings,
 *   exporting to a backup file and importing into a fresh database should produce a state
 *   equivalent to the original, with all records and relationships preserved.
 *
 * Property 17: Invalid Import Leaves Database Unchanged
 * - For any corrupted or invalid backup file (truncated, malformed JSON, wrong schema version,
 *   missing required tables), attempting an import should fail gracefully and the database state
 *   should remain identical to its state before the import attempt.
 */
import * as fc from 'fast-check';
import { ImportError } from '../../core/errors';
import {
  BACKUP_MAGIC,
  BACKUP_VERSION,
  REQUIRED_TABLES,
  type BackupFile,
  type BackupData,
} from './types';

// --- In-memory database simulation ---

type TableData = Record<string, unknown>[];

interface InMemoryDatabase {
  notifications: TableData;
  rules: TableData;
  ruleConditions: TableData;
  ruleActions: TableData;
  ruleExecutions: TableData;
  analytics: TableData;
  focusSessions: TableData;
  settings: TableData;
  aiPredictions: TableData;
}

function createEmptyDb(): InMemoryDatabase {
  return {
    notifications: [],
    rules: [],
    ruleConditions: [],
    ruleActions: [],
    ruleExecutions: [],
    analytics: [],
    focusSessions: [],
    settings: [],
    aiPredictions: [],
  };
}

function deepCloneDb(db: InMemoryDatabase): InMemoryDatabase {
  return JSON.parse(JSON.stringify(db));
}

// --- Shared mock state (prefixed with "mock" for jest.mock() scoping) ---

const mockState = {
  currentDb: createEmptyDb() as InMemoryDatabase,
  snapshotDb: createEmptyDb() as InMemoryDatabase,
  inTransaction: false,
  simulateInsertFailure: false,
  fileContent: null as string | null,
  fileExists: true,
  lastWrittenContent: null as string | null,
};

// Make mockState accessible globally for jest.mock factories
(global as any).mockState = mockState;

// --- Mock expo-file-system ---

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  EncodingType: { UTF8: 'utf8' },
  getInfoAsync: () => {
    const state = (global as any).mockState;
    return Promise.resolve({ exists: state.fileExists, size: 1024 });
  },
  makeDirectoryAsync: () => Promise.resolve(undefined),
  writeAsStringAsync: (_path: string, content: string) => {
    const state = (global as any).mockState;
    state.lastWrittenContent = content;
    return Promise.resolve(undefined);
  },
  readAsStringAsync: () => {
    const state = (global as any).mockState;
    if (state.fileContent === null) {
      return Promise.reject(new Error('File not found'));
    }
    return Promise.resolve(state.fileContent);
  },
  readDirectoryAsync: () => Promise.resolve([]),
}), { virtual: true });

// --- Mock database ---

jest.mock('../../database', () => ({
  get db() {
    const state = (global as any).mockState;
    return {
      select: () => ({
        from: (table: { _: string }) => {
          const tableName = table._ as string;
          return Promise.resolve([...state.currentDb[tableName]]);
        },
      }),
      insert: (table: { _: string }) => ({
        values: (rows: unknown[]) => {
          if (state.simulateInsertFailure) {
            state.simulateInsertFailure = false;
            return Promise.reject(new Error('Simulated insert failure'));
          }
          const tableName = table._ as string;
          state.currentDb[tableName].push(...(rows as Record<string, unknown>[]));
          return Promise.resolve(undefined);
        },
      }),
    };
  },
  get expoDb() {
    const state = (global as any).mockState;
    return {
      execSync: (sql: string) => {
        if (sql === 'BEGIN TRANSACTION;') {
          state.inTransaction = true;
          state.snapshotDb = JSON.parse(JSON.stringify(state.currentDb));
        } else if (sql === 'COMMIT;') {
          state.inTransaction = false;
        } else if (sql === 'ROLLBACK;') {
          state.currentDb = JSON.parse(JSON.stringify(state.snapshotDb));
          state.inTransaction = false;
        } else if (sql.startsWith('DELETE FROM ')) {
          const tableMap: Record<string, string> = {
            'DELETE FROM notifications;': 'notifications',
            'DELETE FROM rules;': 'rules',
            'DELETE FROM rule_conditions;': 'ruleConditions',
            'DELETE FROM rule_actions;': 'ruleActions',
            'DELETE FROM rule_executions;': 'ruleExecutions',
            'DELETE FROM analytics;': 'analytics',
            'DELETE FROM focus_sessions;': 'focusSessions',
            'DELETE FROM settings;': 'settings',
            'DELETE FROM ai_predictions;': 'aiPredictions',
          };
          const tableName = tableMap[sql];
          if (tableName) {
            state.currentDb[tableName] = [];
          }
        }
      },
    };
  },
}));

jest.mock('../../database/schema', () => ({
  notifications: { _: 'notifications' },
  rules: { _: 'rules' },
  ruleConditions: { _: 'ruleConditions' },
  ruleActions: { _: 'ruleActions' },
  ruleExecutions: { _: 'ruleExecutions' },
  analytics: { _: 'analytics' },
  focusSessions: { _: 'focusSessions' },
  settings: { _: 'settings' },
  aiPredictions: { _: 'aiPredictions' },
}));

jest.mock('../../core/constants', () => ({
  APP_VERSION: '1.0.0',
}));

import { BackupService } from './backup.service';

// --- Custom Arbitraries ---

const NOTIFICATION_CATEGORIES = ['important', 'work', 'social', 'spam', 'promotion', 'emergency'];
const TRIGGER_TYPES = ['app', 'keyword', 'contact', 'time', 'location', 'frequency'];
const CONDITION_TYPES = ['contains', 'not_contains', 'regex', 'category', 'priority', 'time_window'];
const ACTION_TYPES = ['dismiss', 'delay', 'alarm', 'vibrate', 'reply', 'launch_app', 'batch', 'webhook', 'copy', 'speak'];
const FOCUS_PRESETS = ['study', 'work', 'sleep', 'meeting', 'custom'];
const FOCUS_STATUSES = ['active', 'paused', 'completed', 'cancelled'];
const EXECUTION_STATUSES = ['success', 'partial', 'failed'];

/** Arbitrary for a notification record (as stored in DB) */
const notificationRecordArb = fc.record({
  id: fc.uuid(),
  packageName: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  appName: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  title: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
  content: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  sender: fc.option(fc.string({ maxLength: 30 }), { nil: null }),
  category: fc.option(fc.constantFrom(...NOTIFICATION_CATEGORIES), { nil: null }),
  priority: fc.integer({ min: 0, max: 5 }),
  isRead: fc.boolean(),
  isArchived: fc.boolean(),
  rawData: fc.constant(null),
  receivedAt: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-01-01') }),
  createdAt: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-01-01') }),
});

/** Arbitrary for a rule record */
const ruleRecordArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  description: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
  triggerType: fc.constantFrom(...TRIGGER_TYPES),
  triggerConfig: fc.constant('{}'),
  isActive: fc.boolean(),
  priority: fc.integer({ min: 0, max: 100 }),
  executionCount: fc.integer({ min: 0, max: 1000 }),
  lastTriggeredAt: fc.option(fc.date({ min: new Date('2023-01-01'), max: new Date('2025-01-01') }), { nil: null }),
  createdAt: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-01-01') }),
  updatedAt: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-01-01') }),
});

/** Arbitrary for a rule condition record */
const ruleConditionRecordArb = (ruleId: string) => fc.record({
  id: fc.uuid(),
  ruleId: fc.constant(ruleId),
  type: fc.constantFrom(...CONDITION_TYPES),
  config: fc.constant('{"operator":"equals","value":"test"}'),
  logicOperator: fc.constantFrom('AND', 'OR'),
  orderIndex: fc.integer({ min: 0, max: 10 }),
});

/** Arbitrary for a rule action record */
const ruleActionRecordArb = (ruleId: string) => fc.record({
  id: fc.uuid(),
  ruleId: fc.constant(ruleId),
  type: fc.constantFrom(...ACTION_TYPES),
  config: fc.constant('{}'),
  orderIndex: fc.integer({ min: 0, max: 10 }),
});

/** Arbitrary for a rule execution record */
const ruleExecutionRecordArb = (ruleId: string, notificationId: string) => fc.record({
  id: fc.uuid(),
  ruleId: fc.constant(ruleId),
  notificationId: fc.constant(notificationId),
  status: fc.constantFrom(...EXECUTION_STATUSES),
  actionsExecuted: fc.constant('[{"type":"dismiss","success":true}]'),
  errorDetails: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
  durationMs: fc.integer({ min: 1, max: 5000 }),
  executedAt: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-01-01') }),
});

/** Arbitrary for an analytics record */
const analyticsRecordArb = fc.record({
  id: fc.uuid(),
  date: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-01-01') }).map((d) => d.toISOString().split('T')[0]),
  hour: fc.option(fc.integer({ min: 0, max: 23 }), { nil: null }),
  notificationCount: fc.integer({ min: 0, max: 500 }),
  ruleTriggeredCount: fc.integer({ min: 0, max: 100 }),
  focusMinutes: fc.integer({ min: 0, max: 480 }),
  distractionCount: fc.integer({ min: 0, max: 50 }),
  topApps: fc.option(fc.constant('[{"packageName":"com.test","count":5}]'), { nil: null }),
  categoryBreakdown: fc.option(fc.constant('{"work":3,"social":2}'), { nil: null }),
});

/** Arbitrary for a focus session record */
const focusSessionRecordArb = fc.record({
  id: fc.uuid(),
  preset: fc.constantFrom(...FOCUS_PRESETS),
  status: fc.constantFrom(...FOCUS_STATUSES),
  startedAt: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-01-01') }),
  endedAt: fc.option(fc.date({ min: new Date('2023-01-01'), max: new Date('2025-01-01') }), { nil: null }),
  plannedDurationMin: fc.integer({ min: 5, max: 480 }),
  actualDurationMin: fc.option(fc.integer({ min: 0, max: 480 }), { nil: null }),
  blockedCount: fc.integer({ min: 0, max: 100 }),
  interruptionCount: fc.integer({ min: 0, max: 50 }),
  blockedApps: fc.option(fc.constant('["com.social.app"]'), { nil: null }),
  allowedApps: fc.option(fc.constant('["com.work.app"]'), { nil: null }),
});

/** Arbitrary for a settings record */
const settingRecordArb = fc.record({
  key: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => /^[a-zA-Z0-9._-]+$/.test(s)),
  value: fc.string({ minLength: 1, maxLength: 100 }),
  updatedAt: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-01-01') }),
});

/** Arbitrary for an AI prediction record */
const aiPredictionRecordArb = (notificationId: string) => fc.record({
  id: fc.uuid(),
  notificationId: fc.constant(notificationId),
  predictedCategory: fc.constantFrom(...NOTIFICATION_CATEGORIES),
  confidence: fc.double({ min: 0, max: 1, noNaN: true }),
  matchedKeywords: fc.option(fc.constant('["urgent","important"]'), { nil: null }),
  createdAt: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-01-01') }),
});

/**
 * Generates a complete, consistent database state where foreign keys are valid.
 */
const databaseStateArb: fc.Arbitrary<InMemoryDatabase> = fc
  .tuple(
    fc.array(notificationRecordArb, { minLength: 0, maxLength: 3 }),
    fc.array(ruleRecordArb, { minLength: 0, maxLength: 3 }),
    fc.array(analyticsRecordArb, { minLength: 0, maxLength: 3 }),
    fc.array(focusSessionRecordArb, { minLength: 0, maxLength: 3 }),
    fc.array(settingRecordArb, { minLength: 0, maxLength: 3 }),
  )
  .chain(([notifs, rulesList, analyticsList, sessions, settingsList]) => {
    // Generate conditions and actions referencing existing rule IDs
    const ruleConditionsArb = rulesList.length > 0
      ? fc.array(
          fc.constantFrom(...rulesList.map((r) => r.id)).chain((ruleId) => ruleConditionRecordArb(ruleId)),
          { minLength: 0, maxLength: 3 }
        )
      : fc.constant([] as Record<string, unknown>[]);

    const ruleActionsArb = rulesList.length > 0
      ? fc.array(
          fc.constantFrom(...rulesList.map((r) => r.id)).chain((ruleId) => ruleActionRecordArb(ruleId)),
          { minLength: 0, maxLength: 3 }
        )
      : fc.constant([] as Record<string, unknown>[]);

    // Generate executions referencing existing rule and notification IDs
    const ruleExecutionsArb = (rulesList.length > 0 && notifs.length > 0)
      ? fc.array(
          fc.tuple(
            fc.constantFrom(...rulesList.map((r) => r.id)),
            fc.constantFrom(...notifs.map((n) => n.id))
          ).chain(([ruleId, notifId]) => ruleExecutionRecordArb(ruleId, notifId)),
          { minLength: 0, maxLength: 3 }
        )
      : fc.constant([] as Record<string, unknown>[]);

    // Generate AI predictions referencing existing notification IDs
    const aiPredictionsArb = notifs.length > 0
      ? fc.array(
          fc.constantFrom(...notifs.map((n) => n.id)).chain((notifId) => aiPredictionRecordArb(notifId)),
          { minLength: 0, maxLength: 3 }
        )
      : fc.constant([] as Record<string, unknown>[]);

    return fc.tuple(
      fc.constant(notifs),
      fc.constant(rulesList),
      ruleConditionsArb,
      ruleActionsArb,
      ruleExecutionsArb,
      fc.constant(analyticsList),
      fc.constant(sessions),
      fc.constant(settingsList),
      aiPredictionsArb,
    );
  })
  .map(([notifs, rulesList, conditions, actions, executions, analyticsList, sessions, settingsList, predictions]) => ({
    notifications: notifs as TableData,
    rules: rulesList as TableData,
    ruleConditions: conditions as TableData,
    ruleActions: actions as TableData,
    ruleExecutions: executions as TableData,
    analytics: analyticsList as TableData,
    focusSessions: sessions as TableData,
    settings: settingsList as TableData,
    aiPredictions: predictions as TableData,
  }));

// --- Corruption strategies for Property 17 ---

type CorruptionStrategy =
  | 'truncated_json'
  | 'not_json'
  | 'wrong_magic'
  | 'future_version'
  | 'missing_data'
  | 'missing_tables'
  | 'tables_not_arrays'
  | 'null_data'
  | 'empty_object';

const corruptionStrategyArb: fc.Arbitrary<CorruptionStrategy> = fc.constantFrom(
  'truncated_json',
  'not_json',
  'wrong_magic',
  'future_version',
  'missing_data',
  'missing_tables',
  'tables_not_arrays',
  'null_data',
  'empty_object',
);

/** Generates a corrupted backup file string based on the strategy */
function generateCorruptedBackup(strategy: CorruptionStrategy): string {
  switch (strategy) {
    case 'truncated_json':
      return '{"magic":"NOTIVER_BACKUP","version":1,"data":{"notif';

    case 'not_json':
      return 'this is not json at all!!! <xml>nope</xml>';

    case 'wrong_magic':
      return JSON.stringify({
        magic: 'WRONG_MAGIC_VALUE',
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        appVersion: '1.0.0',
        data: makeEmptyData(),
      });

    case 'future_version':
      return JSON.stringify({
        magic: BACKUP_MAGIC,
        version: 999,
        createdAt: new Date().toISOString(),
        appVersion: '1.0.0',
        data: makeEmptyData(),
      });

    case 'missing_data':
      return JSON.stringify({
        magic: BACKUP_MAGIC,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        appVersion: '1.0.0',
        // no data field
      });

    case 'missing_tables': {
      // Only include some tables, not all required ones
      return JSON.stringify({
        magic: BACKUP_MAGIC,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        appVersion: '1.0.0',
        data: {
          notifications: [],
          rules: [],
          // missing other required tables
        },
      });
    }

    case 'tables_not_arrays':
      return JSON.stringify({
        magic: BACKUP_MAGIC,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        appVersion: '1.0.0',
        data: {
          notifications: 'not an array',
          rules: 42,
          ruleConditions: {},
          ruleActions: null,
          ruleExecutions: [],
          analytics: [],
          focusSessions: [],
          settings: [],
          aiPredictions: [],
        },
      });

    case 'null_data':
      return JSON.stringify({
        magic: BACKUP_MAGIC,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        appVersion: '1.0.0',
        data: null,
      });

    case 'empty_object':
      return JSON.stringify({});

    default:
      return '';
  }
}

function makeEmptyData(): BackupData {
  return {
    notifications: [],
    rules: [],
    ruleConditions: [],
    ruleActions: [],
    ruleExecutions: [],
    analytics: [],
    focusSessions: [],
    settings: [],
    aiPredictions: [],
  };
}

// --- Tests ---

describe('Property 16: Export/Import Database Round-Trip', () => {
  /**
   * **Validates: Requirements 14.3, 14.4**
   */

  let service: BackupService;

  beforeEach(() => {
    service = new BackupService();
    mockState.currentDb = createEmptyDb();
    mockState.snapshotDb = createEmptyDb();
    mockState.inTransaction = false;
    mockState.simulateInsertFailure = false;
    mockState.lastWrittenContent = null;
    mockState.fileContent = null;
    mockState.fileExists = true;
  });

  it('export → import into fresh DB produces equivalent state for any database content', async () => {
    await fc.assert(
      fc.asyncProperty(databaseStateArb, async (dbState) => {
        // Set up the database with the generated state
        mockState.currentDb = deepCloneDb(dbState);

        // Export the database
        await service.exportDatabase();

        // The export should have written content
        expect(mockState.lastWrittenContent).not.toBeNull();

        // Parse the exported content to verify structure
        const exported = JSON.parse(mockState.lastWrittenContent!) as BackupFile;
        expect(exported.magic).toBe(BACKUP_MAGIC);
        expect(exported.version).toBe(BACKUP_VERSION);

        // Now simulate importing into a fresh database
        mockState.currentDb = createEmptyDb();
        mockState.fileContent = mockState.lastWrittenContent;

        await service.importDatabase('/mock/backup.json');

        // Verify the imported state matches the original
        // Compare each table's records
        for (const tableName of REQUIRED_TABLES) {
          const originalRecords = dbState[tableName] as TableData;
          const importedRecords = mockState.currentDb[tableName] as TableData;

          expect(importedRecords.length).toBe(originalRecords.length);

          // Sort both by id (or key for settings) for stable comparison
          const sortKey = tableName === 'settings' ? 'key' : 'id';
          const sortedOriginal = [...originalRecords].sort((a, b) =>
            String(a[sortKey]).localeCompare(String(b[sortKey]))
          );
          const sortedImported = [...importedRecords].sort((a, b) =>
            String(a[sortKey]).localeCompare(String(b[sortKey]))
          );

          // Deep equality check — JSON serialization normalizes Date objects
          expect(JSON.stringify(sortedImported)).toBe(JSON.stringify(sortedOriginal));
        }
      }),
      { numRuns: 50 }
    );
  });

  it('exported backup contains all required tables as arrays', async () => {
    await fc.assert(
      fc.asyncProperty(databaseStateArb, async (dbState) => {
        mockState.currentDb = deepCloneDb(dbState);

        await service.exportDatabase();

        const exported = JSON.parse(mockState.lastWrittenContent!) as BackupFile;

        for (const table of REQUIRED_TABLES) {
          expect(exported.data).toHaveProperty(table);
          expect(Array.isArray(exported.data[table])).toBe(true);
        }
      }),
      { numRuns: 50 }
    );
  });

  it('record count in export matches total records across all tables', async () => {
    await fc.assert(
      fc.asyncProperty(databaseStateArb, async (dbState) => {
        mockState.currentDb = deepCloneDb(dbState);

        const result = await service.exportDatabase();

        const expectedCount = REQUIRED_TABLES.reduce(
          (sum, table) => sum + (dbState[table] as TableData).length,
          0
        );

        expect(result.recordCount).toBe(expectedCount);
      }),
      { numRuns: 50 }
    );
  });
});

describe('Property 17: Invalid Import Leaves Database Unchanged', () => {
  /**
   * **Validates: Requirements 14.5**
   */

  let service: BackupService;

  beforeEach(() => {
    service = new BackupService();
    mockState.currentDb = createEmptyDb();
    mockState.snapshotDb = createEmptyDb();
    mockState.inTransaction = false;
    mockState.simulateInsertFailure = false;
    mockState.lastWrittenContent = null;
    mockState.fileContent = null;
    mockState.fileExists = true;
  });

  it('corrupted/malformed backup files are rejected and database state is unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        databaseStateArb,
        corruptionStrategyArb,
        async (dbState, strategy) => {
          // Set up the database with some existing state
          mockState.currentDb = deepCloneDb(dbState);
          const stateBeforeImport = deepCloneDb(mockState.currentDb);

          // Generate a corrupted backup
          mockState.fileContent = generateCorruptedBackup(strategy);
          mockState.fileExists = true;

          // Attempt import — should throw ImportError
          await expect(service.importDatabase('/mock/corrupted.json')).rejects.toThrow(ImportError);

          // Verify database state is unchanged
          for (const tableName of REQUIRED_TABLES) {
            const beforeRecords = stateBeforeImport[tableName] as TableData;
            const afterRecords = mockState.currentDb[tableName] as TableData;

            expect(JSON.stringify(afterRecords)).toBe(JSON.stringify(beforeRecords));
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('import failure during data insertion triggers rollback preserving original state', async () => {
    await fc.assert(
      fc.asyncProperty(databaseStateArb, async (dbState) => {
        // Set up the database with existing state
        mockState.currentDb = deepCloneDb(dbState);
        const stateBeforeImport = deepCloneDb(mockState.currentDb);

        // Create a valid backup file but simulate insert failure
        const validBackup: BackupFile = {
          magic: BACKUP_MAGIC,
          version: BACKUP_VERSION,
          createdAt: new Date().toISOString(),
          appVersion: '1.0.0',
          data: {
            notifications: [{ id: 'test-1', packageName: 'com.test', appName: 'Test' }],
            rules: [],
            ruleConditions: [],
            ruleActions: [],
            ruleExecutions: [],
            analytics: [],
            focusSessions: [],
            settings: [],
            aiPredictions: [],
          },
        };

        mockState.fileContent = JSON.stringify(validBackup);
        mockState.fileExists = true;
        mockState.simulateInsertFailure = true;

        // Attempt import — should throw due to insert failure
        await expect(service.importDatabase('/mock/backup.json')).rejects.toThrow(ImportError);

        // Verify database state is unchanged (rollback restored it)
        for (const tableName of REQUIRED_TABLES) {
          const beforeRecords = stateBeforeImport[tableName] as TableData;
          const afterRecords = mockState.currentDb[tableName] as TableData;

          expect(JSON.stringify(afterRecords)).toBe(JSON.stringify(beforeRecords));
        }
      }),
      { numRuns: 50 }
    );
  });

  it('non-existent file import fails gracefully without modifying database', async () => {
    await fc.assert(
      fc.asyncProperty(databaseStateArb, async (dbState) => {
        mockState.currentDb = deepCloneDb(dbState);
        const stateBeforeImport = deepCloneDb(mockState.currentDb);

        mockState.fileExists = false;
        mockState.fileContent = null;

        await expect(service.importDatabase('/nonexistent.json')).rejects.toThrow(ImportError);

        // Verify database state is unchanged
        for (const tableName of REQUIRED_TABLES) {
          const beforeRecords = stateBeforeImport[tableName] as TableData;
          const afterRecords = mockState.currentDb[tableName] as TableData;

          expect(JSON.stringify(afterRecords)).toBe(JSON.stringify(beforeRecords));
        }
      }),
      { numRuns: 50 }
    );
  });
});
