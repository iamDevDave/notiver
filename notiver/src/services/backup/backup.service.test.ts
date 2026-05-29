import { ImportError } from '../../core/errors';
import {
  BACKUP_MAGIC,
  BACKUP_VERSION,
  REQUIRED_TABLES,
  type BackupFile,
  type BackupData,
} from './types';

// Mock expo-file-system
const mockGetInfoAsync = jest.fn();
const mockMakeDirectoryAsync = jest.fn();
const mockWriteAsStringAsync = jest.fn();
const mockReadAsStringAsync = jest.fn();
const mockReadDirectoryAsync = jest.fn();

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  EncodingType: { UTF8: 'utf8' },
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  makeDirectoryAsync: (...args: unknown[]) => mockMakeDirectoryAsync(...args),
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
  readAsStringAsync: (...args: unknown[]) => mockReadAsStringAsync(...args),
  readDirectoryAsync: (...args: unknown[]) => mockReadDirectoryAsync(...args),
}), { virtual: true });

// Mock database
const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockInsert = jest.fn();
const mockValues = jest.fn();
const mockExecSync = jest.fn();

const mockDbChain = {
  select: () => mockDbChain,
  from: (table: unknown) => {
    mockFrom(table);
    return Promise.resolve([]);
  },
  insert: (table: unknown) => {
    mockInsert(table);
    return { values: mockValues };
  },
};

jest.mock('../../database', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        mockFrom(table);
        return Promise.resolve([]);
      },
    }),
    insert: (table: unknown) => {
      mockInsert(table);
      return { values: (...args: unknown[]) => mockValues(...args) };
    },
  },
  expoDb: {
    execSync: (sql: string) => mockExecSync(sql),
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

function makeValidBackup(overrides: Partial<BackupFile> = {}): BackupFile {
  return {
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: '1.0.0',
    data: makeEmptyBackupData(),
    ...overrides,
  };
}

function makeEmptyBackupData(): BackupData {
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

describe('BackupService', () => {
  let service: BackupService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BackupService();
    mockValues.mockResolvedValue(undefined);
  });

  describe('exportDatabase()', () => {
    beforeEach(() => {
      mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
      mockWriteAsStringAsync.mockResolvedValue(undefined);
    });

    it('creates backup directory if it does not exist', async () => {
      mockGetInfoAsync
        .mockResolvedValueOnce({ exists: false }) // directory check
        .mockResolvedValueOnce({ exists: true, size: 100 }); // file info after write
      mockMakeDirectoryAsync.mockResolvedValue(undefined);

      await service.exportDatabase();

      expect(mockMakeDirectoryAsync).toHaveBeenCalledWith(
        expect.stringContaining('backups/'),
        { intermediates: true }
      );
    });

    it('writes a valid JSON backup file', async () => {
      await service.exportDatabase();

      expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
      const [filePath, content, options] = mockWriteAsStringAsync.mock.calls[0];

      expect(filePath).toContain('backups/notiver-backup-');
      expect(filePath.endsWith('.json')).toBe(true);
      expect(options).toEqual({ encoding: 'utf8' });

      const parsed = JSON.parse(content);
      expect(parsed.magic).toBe(BACKUP_MAGIC);
      expect(parsed.version).toBe(BACKUP_VERSION);
      expect(parsed.appVersion).toBe('1.0.0');
      expect(parsed.createdAt).toBeDefined();
      expect(parsed.data).toBeDefined();
    });

    it('includes all required tables in the export', async () => {
      await service.exportDatabase();

      const content = mockWriteAsStringAsync.mock.calls[0][1];
      const parsed = JSON.parse(content);

      for (const table of REQUIRED_TABLES) {
        expect(parsed.data).toHaveProperty(table);
        expect(Array.isArray(parsed.data[table])).toBe(true);
      }
    });

    it('returns export result with file path and record count', async () => {
      const result = await service.exportDatabase();

      expect(result.filePath).toContain('backups/notiver-backup-');
      expect(result.recordCount).toBe(0);
      expect(typeof result.size).toBe('number');
    });
  });

  describe('importDatabase()', () => {
    it('successfully imports a valid backup file', async () => {
      const backup = makeValidBackup({
        data: {
          ...makeEmptyBackupData(),
          settings: [{ key: 'theme', value: 'dark', updatedAt: new Date() }],
        },
      });

      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockReadAsStringAsync.mockResolvedValue(JSON.stringify(backup));

      const result = await service.importDatabase('/path/to/backup.json');

      expect(result.recordCount).toBe(1);
      expect(result.tablesRestored).toBe(1);
    });

    it('wraps restore in a transaction', async () => {
      const backup = makeValidBackup();
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockReadAsStringAsync.mockResolvedValue(JSON.stringify(backup));

      await service.importDatabase('/path/to/backup.json');

      expect(mockExecSync).toHaveBeenCalledWith('BEGIN TRANSACTION;');
      expect(mockExecSync).toHaveBeenCalledWith('COMMIT;');
    });

    it('rolls back transaction on insert failure', async () => {
      const backup = makeValidBackup({
        data: {
          ...makeEmptyBackupData(),
          notifications: [{ id: '1', packageName: 'com.test' }],
        },
      });

      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockReadAsStringAsync.mockResolvedValue(JSON.stringify(backup));
      mockValues.mockRejectedValueOnce(new Error('Insert failed'));

      await expect(service.importDatabase('/path/to/backup.json')).rejects.toThrow(ImportError);

      expect(mockExecSync).toHaveBeenCalledWith('BEGIN TRANSACTION;');
      expect(mockExecSync).toHaveBeenCalledWith('ROLLBACK;');
      expect(mockExecSync).not.toHaveBeenCalledWith('COMMIT;');
    });

    it('throws ImportError with "corrupted" for non-existent file', async () => {
      mockGetInfoAsync.mockResolvedValue({ exists: false });
      mockReadAsStringAsync.mockRejectedValue(new Error('File not found'));

      await expect(service.importDatabase('/nonexistent.json')).rejects.toThrow(ImportError);
      await expect(service.importDatabase('/nonexistent.json')).rejects.toMatchObject({
        reason: 'corrupted',
      });
    });

    it('throws ImportError with "corrupted" for invalid JSON', async () => {
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockReadAsStringAsync.mockResolvedValue('not valid json {{{');

      await expect(service.importDatabase('/path/to/bad.json')).rejects.toThrow(ImportError);
      await expect(service.importDatabase('/path/to/bad.json')).rejects.toMatchObject({
        reason: 'corrupted',
      });
    });

    it('throws ImportError with "invalid_schema" for wrong magic', async () => {
      const backup = { ...makeValidBackup(), magic: 'WRONG_MAGIC' };
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockReadAsStringAsync.mockResolvedValue(JSON.stringify(backup));

      await expect(service.importDatabase('/path/to/bad.json')).rejects.toThrow(ImportError);
      await expect(service.importDatabase('/path/to/bad.json')).rejects.toMatchObject({
        reason: 'invalid_schema',
      });
    });

    it('throws ImportError with "version_mismatch" for future version', async () => {
      const backup = { ...makeValidBackup(), version: 999 };
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockReadAsStringAsync.mockResolvedValue(JSON.stringify(backup));

      await expect(service.importDatabase('/path/to/bad.json')).rejects.toThrow(ImportError);
      await expect(service.importDatabase('/path/to/bad.json')).rejects.toMatchObject({
        reason: 'version_mismatch',
      });
    });

    it('throws ImportError with "invalid_schema" for missing tables', async () => {
      const backup = {
        magic: BACKUP_MAGIC,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        appVersion: '1.0.0',
        data: { notifications: [] }, // missing other tables
      };
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockReadAsStringAsync.mockResolvedValue(JSON.stringify(backup));

      await expect(service.importDatabase('/path/to/bad.json')).rejects.toThrow(ImportError);
      await expect(service.importDatabase('/path/to/bad.json')).rejects.toMatchObject({
        reason: 'invalid_schema',
      });
    });

    it('throws ImportError with "invalid_schema" when table value is not an array', async () => {
      const backup = {
        magic: BACKUP_MAGIC,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        appVersion: '1.0.0',
        data: {
          ...makeEmptyBackupData(),
          notifications: 'not an array',
        },
      };
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockReadAsStringAsync.mockResolvedValue(JSON.stringify(backup));

      await expect(service.importDatabase('/path/to/bad.json')).rejects.toThrow(ImportError);
      await expect(service.importDatabase('/path/to/bad.json')).rejects.toMatchObject({
        reason: 'invalid_schema',
      });
    });

    it('deletes existing data before restoring', async () => {
      const backup = makeValidBackup();
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockReadAsStringAsync.mockResolvedValue(JSON.stringify(backup));

      await service.importDatabase('/path/to/backup.json');

      // Verify DELETE statements were executed
      expect(mockExecSync).toHaveBeenCalledWith('DELETE FROM ai_predictions;');
      expect(mockExecSync).toHaveBeenCalledWith('DELETE FROM rule_executions;');
      expect(mockExecSync).toHaveBeenCalledWith('DELETE FROM rule_actions;');
      expect(mockExecSync).toHaveBeenCalledWith('DELETE FROM rule_conditions;');
      expect(mockExecSync).toHaveBeenCalledWith('DELETE FROM analytics;');
      expect(mockExecSync).toHaveBeenCalledWith('DELETE FROM focus_sessions;');
      expect(mockExecSync).toHaveBeenCalledWith('DELETE FROM settings;');
      expect(mockExecSync).toHaveBeenCalledWith('DELETE FROM rules;');
      expect(mockExecSync).toHaveBeenCalledWith('DELETE FROM notifications;');
    });
  });

  describe('listBackups()', () => {
    it('returns empty array when backup directory does not exist', async () => {
      mockGetInfoAsync.mockResolvedValue({ exists: false });

      const result = await service.listBackups();

      expect(result).toEqual([]);
    });

    it('returns sorted JSON files from backup directory', async () => {
      mockGetInfoAsync.mockResolvedValue({ exists: true });
      mockReadDirectoryAsync.mockResolvedValue([
        'notiver-backup-2024-01-01.json',
        'notiver-backup-2024-01-02.json',
        'other-file.txt',
      ]);

      const result = await service.listBackups();

      expect(result).toEqual([
        'notiver-backup-2024-01-02.json',
        'notiver-backup-2024-01-01.json',
      ]);
    });
  });

  describe('getBackupDirectory()', () => {
    it('returns the backup directory path', () => {
      const dir = service.getBackupDirectory();
      expect(dir).toContain('backups/');
    });
  });
});
