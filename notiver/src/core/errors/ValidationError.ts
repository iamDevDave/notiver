import { AppError } from './AppError';

/**
 * Error thrown when input validation fails.
 * Contains a map of field names to error messages.
 */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly isRecoverable = true;

  constructor(public readonly fields: Record<string, string>) {
    super('Validation failed');
  }
}
