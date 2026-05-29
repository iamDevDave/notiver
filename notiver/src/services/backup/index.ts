import { BackupService } from './backup.service';
export { BACKUP_MAGIC, BACKUP_VERSION, REQUIRED_TABLES } from './types';
export type { BackupData, BackupFile, ExportResult, ImportResult } from './types';
export { BackupService };

// Singleton instance for use across the application
export const backupService = new BackupService();
