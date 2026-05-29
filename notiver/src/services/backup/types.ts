/**
 * Types for the backup export/import service.
 */

export const BACKUP_VERSION = 1;
export const BACKUP_MAGIC = 'NOTIVER_BACKUP';

/**
 * The structure of a complete backup file.
 */
export interface BackupFile {
  /** Magic identifier to validate this is a Notiver backup */
  magic: typeof BACKUP_MAGIC;
  /** Backup format version for forward compatibility */
  version: number;
  /** ISO timestamp when the backup was created */
  createdAt: string;
  /** App version that created the backup */
  appVersion: string;
  /** The serialized database tables */
  data: BackupData;
}

/**
 * All database tables serialized as arrays of records.
 * Timestamps are stored as ISO strings for portability.
 */
export interface BackupData {
  notifications: unknown[];
  rules: unknown[];
  ruleConditions: unknown[];
  ruleActions: unknown[];
  ruleExecutions: unknown[];
  analytics: unknown[];
  focusSessions: unknown[];
  settings: unknown[];
  aiPredictions: unknown[];
}

/**
 * Required table keys that must be present in a valid backup.
 */
export const REQUIRED_TABLES: (keyof BackupData)[] = [
  'notifications',
  'rules',
  'ruleConditions',
  'ruleActions',
  'ruleExecutions',
  'analytics',
  'focusSessions',
  'settings',
  'aiPredictions',
];

export interface ExportResult {
  filePath: string;
  size: number;
  recordCount: number;
}

export interface ImportResult {
  recordCount: number;
  tablesRestored: number;
}
