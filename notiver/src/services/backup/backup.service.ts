import * as FileSystem from 'expo-file-system';
import { APP_VERSION } from '../../core/constants';
import { ImportError } from '../../core/errors';
import { db, expoDb } from '../../database';
import {
    aiPredictions,
    analytics,
    focusSessions,
    notifications,
    ruleActions,
    ruleConditions,
    ruleExecutions,
    rules,
    settings,
} from '../../database/schema';
import {
    BACKUP_MAGIC,
    BACKUP_VERSION,
    REQUIRED_TABLES,
    type BackupData,
    type BackupFile,
    type ExportResult,
    type ImportResult,
} from './types';

// Some Expo platform types may be unavailable in this environment; use an
// `any` cast for runtime properties we rely on (documentDirectory, EncodingType).
const _FileSystem: any = FileSystem;

/**
 * Service for exporting and importing the complete database as a JSON backup file.
 *
 * Export: Serializes all tables to a structured JSON file on the device file system.
 * Import: Validates the backup file structure, wraps restoration in a transaction,
 *         and rolls back on any failure to leave the database unchanged.
 */
export class BackupService {
  private readonly backupDir = `${_FileSystem.documentDirectory ?? ''}backups/`;

  /**
   * Exports the entire database to a JSON backup file.
   * The file is written to the app's document directory under backups/.
   *
   * @returns Export result with file path, size, and total record count.
   */
  async exportDatabase(): Promise<ExportResult> {
    // Ensure backup directory exists
    const dirInfo = await FileSystem.getInfoAsync(this.backupDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.backupDir, { intermediates: true });
    }

    // Serialize all tables
    const data = await this.serializeAllTables();

    // Build backup file structure
    const backup: BackupFile = {
      magic: BACKUP_MAGIC,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      data,
    };

    // Write to file system
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `notiver-backup-${timestamp}.json`;
    const filePath = `${this.backupDir}${fileName}`;

    const content = JSON.stringify(backup);
    await FileSystem.writeAsStringAsync(filePath, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const fileInfo = await FileSystem.getInfoAsync(filePath);
    const recordCount = this.countRecords(data);

    return {
      filePath,
      size: fileInfo.exists ? (fileInfo as any).size ?? content.length : content.length,
      recordCount,
    };
  }

  /**
   * Imports a database backup from a file.
   * Validates the file structure and wraps the restore in a transaction.
   * On any failure, the transaction is rolled back and the database remains unchanged.
   *
   * @param fileUri - URI of the backup file to import.
   * @returns Import result with record count and tables restored.
   * @throws ImportError if the file is corrupted, has invalid schema, or wrong version.
   */
  async importDatabase(fileUri: string): Promise<ImportResult> {
    // Read and parse the file
    const content = await this.readBackupFile(fileUri);
    const backup = this.parseAndValidate(content);

    // Restore all tables within a transaction
    return this.restoreAllTables(backup.data);
  }

  /**
   * Returns the backup directory path for external access (e.g., sharing).
   */
  getBackupDirectory(): string {
    return this.backupDir;
  }

  /**
   * Lists all available backup files.
   */
  async listBackups(): Promise<string[]> {
    const dirInfo = await FileSystem.getInfoAsync(this.backupDir);
    if (!dirInfo.exists) {
      return [];
    }
    const files = await FileSystem.readDirectoryAsync(this.backupDir);
    return files
      .filter((f: string) => f.endsWith('.json'))
      .sort()
      .reverse();
  }

  // ─── Private Methods ───────────────────────────────────────────────────────

  private async serializeAllTables(): Promise<BackupData> {
    const [
      notificationRows,
      ruleRows,
      ruleConditionRows,
      ruleActionRows,
      ruleExecutionRows,
      analyticsRows,
      focusSessionRows,
      settingsRows,
      aiPredictionRows,
    ] = await Promise.all([
      db.select().from(notifications),
      db.select().from(rules),
      db.select().from(ruleConditions),
      db.select().from(ruleActions),
      db.select().from(ruleExecutions),
      db.select().from(analytics),
      db.select().from(focusSessions),
      db.select().from(settings),
      db.select().from(aiPredictions),
    ]);

    return {
      notifications: notificationRows,
      rules: ruleRows,
      ruleConditions: ruleConditionRows,
      ruleActions: ruleActionRows,
      ruleExecutions: ruleExecutionRows,
      analytics: analyticsRows,
      focusSessions: focusSessionRows,
      settings: settingsRows,
      aiPredictions: aiPredictionRows,
    };
  }

  private async readBackupFile(fileUri: string): Promise<string> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new ImportError('corrupted');
      }
      return await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (error) {
      if (error instanceof ImportError) throw error;
      throw new ImportError('corrupted');
    }
  }

  private parseAndValidate(content: string): BackupFile {
    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ImportError('corrupted');
    }

    // Validate it's an object
    if (!parsed || typeof parsed !== 'object') {
      throw new ImportError('corrupted');
    }

    const backup = parsed as Record<string, unknown>;

    // Validate magic identifier
    if (backup.magic !== BACKUP_MAGIC) {
      throw new ImportError('invalid_schema');
    }

    // Validate version
    if (typeof backup.version !== 'number' || backup.version > BACKUP_VERSION) {
      throw new ImportError('version_mismatch');
    }

    // Validate data structure
    if (!backup.data || typeof backup.data !== 'object') {
      throw new ImportError('invalid_schema');
    }

    const data = backup.data as Record<string, unknown>;

    // Validate all required tables are present and are arrays
    for (const table of REQUIRED_TABLES) {
      if (!Array.isArray(data[table])) {
        throw new ImportError('invalid_schema');
      }
    }

    return backup as unknown as BackupFile;
  }

  private async restoreAllTables(data: BackupData): Promise<ImportResult> {
    let recordCount = 0;
    let tablesRestored = 0;

    // Use raw SQL transaction for atomicity
    expoDb.execSync('BEGIN TRANSACTION;');

    try {
      // Delete existing data in reverse dependency order
      expoDb.execSync('DELETE FROM ai_predictions;');
      expoDb.execSync('DELETE FROM rule_executions;');
      expoDb.execSync('DELETE FROM rule_actions;');
      expoDb.execSync('DELETE FROM rule_conditions;');
      expoDb.execSync('DELETE FROM analytics;');
      expoDb.execSync('DELETE FROM focus_sessions;');
      expoDb.execSync('DELETE FROM settings;');
      expoDb.execSync('DELETE FROM rules;');
      expoDb.execSync('DELETE FROM notifications;');

      // Restore tables in dependency order (parents first)
      if (data.notifications.length > 0) {
        await this.insertBatch(notifications, data.notifications);
        tablesRestored++;
      }
      recordCount += data.notifications.length;

      if (data.rules.length > 0) {
        await this.insertBatch(rules, data.rules);
        tablesRestored++;
      }
      recordCount += data.rules.length;

      if (data.ruleConditions.length > 0) {
        await this.insertBatch(ruleConditions, data.ruleConditions);
        tablesRestored++;
      }
      recordCount += data.ruleConditions.length;

      if (data.ruleActions.length > 0) {
        await this.insertBatch(ruleActions, data.ruleActions);
        tablesRestored++;
      }
      recordCount += data.ruleActions.length;

      if (data.ruleExecutions.length > 0) {
        await this.insertBatch(ruleExecutions, data.ruleExecutions);
        tablesRestored++;
      }
      recordCount += data.ruleExecutions.length;

      if (data.analytics.length > 0) {
        await this.insertBatch(analytics, data.analytics);
        tablesRestored++;
      }
      recordCount += data.analytics.length;

      if (data.focusSessions.length > 0) {
        await this.insertBatch(focusSessions, data.focusSessions);
        tablesRestored++;
      }
      recordCount += data.focusSessions.length;

      if (data.settings.length > 0) {
        await this.insertBatch(settings, data.settings);
        tablesRestored++;
      }
      recordCount += data.settings.length;

      if (data.aiPredictions.length > 0) {
        await this.insertBatch(aiPredictions, data.aiPredictions);
        tablesRestored++;
      }
      recordCount += data.aiPredictions.length;

      // Commit the transaction
      expoDb.execSync('COMMIT;');

      return { recordCount, tablesRestored };
    } catch (error) {
      // Rollback on any failure — database remains unchanged
      expoDb.execSync('ROLLBACK;');

      if (error instanceof ImportError) throw error;
      throw new ImportError('corrupted');
    }
  }

  private async insertBatch(table: any, rows: unknown[]): Promise<void> {
    if (rows.length === 0) return;

    // Insert in chunks to avoid SQLite variable limits
    const CHUNK_SIZE = 100;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      await db.insert(table).values(chunk as any[]);
    }
  }

  private countRecords(data: BackupData): number {
    return (
      data.notifications.length +
      data.rules.length +
      data.ruleConditions.length +
      data.ruleActions.length +
      data.ruleExecutions.length +
      data.analytics.length +
      data.focusSessions.length +
      data.settings.length +
      data.aiPredictions.length
    );
  }
}
