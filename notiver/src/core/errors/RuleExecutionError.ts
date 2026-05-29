import { AppError } from './AppError';

/**
 * Error thrown when a rule fails to execute.
 * Contains context about which rule and action failed.
 */
export class RuleExecutionError extends AppError {
  readonly code = 'RULE_EXECUTION_ERROR';
  readonly isRecoverable = true;

  constructor(
    public readonly ruleId: string,
    public readonly actionType: string,
    public readonly cause: Error
  ) {
    super(`Rule execution failed: ${cause.message}`);
  }
}
