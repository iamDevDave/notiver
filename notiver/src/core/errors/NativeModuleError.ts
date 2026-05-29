import { AppError } from './AppError';

/**
 * Error thrown when a native module operation fails.
 * These are generally not recoverable without user intervention.
 */
export class NativeModuleError extends AppError {
  readonly code = 'NATIVE_MODULE_ERROR';
  readonly isRecoverable = false;

  constructor(message: string = 'A native module error occurred') {
    super(message);
  }
}
