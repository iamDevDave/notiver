import { db } from '../../../database/index';
import { ruleConditions, ruleActions } from '../../../database/schema';
import { ruleRepository } from '../../../database/repositories';
import type { RuleBuilderFormState } from '../store/rule-builder-store';
import { validateRuleForm, type ValidationResult } from './rule-validation';

/**
 * Persists a validated rule from the builder form to the database.
 * Creates the rule record plus associated conditions and actions.
 *
 * Returns the created rule ID on success, or a validation result on failure.
 */
export async function persistRule(
  form: RuleBuilderFormState
): Promise<{ success: true; ruleId: string } | { success: false; validation: ValidationResult }> {
  // Validate before persisting
  const validation = validateRuleForm(form);
  if (!validation.isValid) {
    return { success: false, validation };
  }

  // Create the rule record
  const rule = await ruleRepository.create({
    name: form.name.trim(),
    description: form.description.trim() || null,
    triggerType: form.triggerType!,
    triggerConfig: JSON.stringify(form.triggerConfig),
    isActive: true,
    priority: 0,
    executionCount: 0,
    lastTriggeredAt: null,
    updatedAt: new Date(),
  });

  // Insert conditions
  if (form.conditions.length > 0) {
    const conditionRecords = form.conditions.map((condition, index) => ({
      id: generateId(),
      ruleId: rule.id,
      type: condition.type,
      config: JSON.stringify(condition.config),
      logicOperator: condition.logicOperator,
      orderIndex: index,
    }));

    await db.insert(ruleConditions).values(conditionRecords);
  }

  // Insert actions
  if (form.actions.length > 0) {
    const actionRecords = form.actions.map((action, index) => ({
      id: generateId(),
      ruleId: rule.id,
      type: action.type,
      config: JSON.stringify(action.config),
      orderIndex: index,
    }));

    await db.insert(ruleActions).values(actionRecords);
  }

  return { success: true, ruleId: rule.id };
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
