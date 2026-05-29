import { AppError } from './AppError';

export type ImportErrorReason = 'corrupted' | 'invalid_schema' | 'version_mismatch';

/**
 * Error thrown when data import fails.
 * Contains the reason for the import failure.
 */
export class ImportError extends AppError {
  readonly code = 'IMPORT_ERROR';
  readonly isRecoverable = true;

  constructor(public readonly reason: ImportErrorReason) {
    super(`Import failed: ${reason}`);
  }
}
