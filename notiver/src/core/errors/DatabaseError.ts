import { AppError } from './AppError';

/**
 * Error thrown when database operations fail.
 */
export class DatabaseError extends AppError {
  readonly code = 'DATABASE_ERROR';
  readonly isRecoverable = true;

  constructor(message: string = 'A database error occurred') {
    super(message);
  }
}
