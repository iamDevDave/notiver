import type { RuleBuilderFormState } from '../store/rule-builder-store';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates the complete rule builder form state before persistence.
 * Returns a result indicating whether the form is valid and any errors found.
 *
 * Validation rules:
 * - Name must be non-empty (trimmed)
 * - Trigger type must be selected
 * - At least one action must be added
 * - Trigger config must have required fields based on type
 */
export function validateRuleForm(form: RuleBuilderFormState): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate name
  if (!form.name.trim()) {
    errors.push({ field: 'name', message: 'Rule name is required' });
  }

  // Validate trigger
  if (!form.triggerType) {
    errors.push({ field: 'triggerType', message: 'A trigger type must be selected' });
  } else {
    const triggerErrors = validateTriggerConfig(form.triggerType, form.triggerConfig);
    errors.push(...triggerErrors);
  }

  // Validate actions
  if (form.actions.length === 0) {
    errors.push({ field: 'actions', message: 'At least one action is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateTriggerConfig(
  triggerType: string,
  config: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (triggerType) {
    case 'app': {
      const packageNames = (config.packageNames as string) ?? '';
      if (!packageNames.trim()) {
        errors.push({
          field: 'triggerConfig',
          message: 'At least one app package name is required',
        });
      }
      break;
    }
    case 'keyword': {
      const keywords = (config.keywords as string) ?? '';
      if (!keywords.trim()) {
        errors.push({
          field: 'triggerConfig',
          message: 'At least one keyword is required',
        });
      }
      break;
    }
    case 'contact': {
      const contacts = (config.contacts as string) ?? '';
      if (!contacts.trim()) {
        errors.push({
          field: 'triggerConfig',
          message: 'At least one contact name is required',
        });
      }
      break;
    }
    case 'time': {
      const startTime = (config.startTime as string) ?? '';
      const endTime = (config.endTime as string) ?? '';
      if (!startTime && !endTime) {
        errors.push({
          field: 'triggerConfig',
          message: 'At least a start or end time is required',
        });
      }
      break;
    }
    case 'frequency': {
      const count = (config.count as string) ?? '';
      if (!count.trim()) {
        errors.push({
          field: 'triggerConfig',
          message: 'Notification count threshold is required',
        });
      }
      break;
    }
    // 'location' is a placeholder, no validation needed
  }

  return errors;
}
