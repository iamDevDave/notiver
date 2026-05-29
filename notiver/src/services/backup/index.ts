export { BackupService } from './backup.service';
export type { BackupFile, BackupData, ExportResult, ImportResult } from './types';
export { BACKUP_VERSION, BACKUP_MAGIC, REQUIRED_TABLES } from './types';

// Singleton instance for use across the application
export const backupService = new BackupService();
