/**
 * Base error class for all application errors.
 * Provides a consistent error interface with error codes and recoverability info.
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly isRecoverable: boolean;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain for proper instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
