import { validateRuleForm } from './rule-validation';
import type { RuleBuilderFormState } from '../store/rule-builder-store';

describe('validateRuleForm', () => {
  const validForm: RuleBuilderFormState = {
    name: 'My Rule',
    description: 'A test rule',
    triggerType: 'keyword',
    triggerConfig: { keywords: 'urgent' },
    conditions: [],
    actions: [{ id: '1', type: 'alarm', config: {} }],
  };

  it('returns valid for a complete form', () => {
    const result = validateRuleForm(validForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects empty name', () => {
    const form = { ...validForm, name: '' };
    const result = validateRuleForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'name' })
    );
  });

  it('rejects whitespace-only name', () => {
    const form = { ...validForm, name: '   ' };
    const result = validateRuleForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'name' })
    );
  });

  it('rejects null trigger type', () => {
    const form = { ...validForm, triggerType: null as any };
    const result = validateRuleForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'triggerType' })
    );
  });

  it('rejects empty actions array', () => {
    const form = { ...validForm, actions: [] };
    const result = validateRuleForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'actions' })
    );
  });

  it('rejects app trigger with empty package names', () => {
    const form: RuleBuilderFormState = {
      ...validForm,
      triggerType: 'app',
      triggerConfig: { packageNames: '' },
    };
    const result = validateRuleForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'triggerConfig' })
    );
  });

  it('rejects keyword trigger with empty keywords', () => {
    const form: RuleBuilderFormState = {
      ...validForm,
      triggerType: 'keyword',
      triggerConfig: { keywords: '  ' },
    };
    const result = validateRuleForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'triggerConfig' })
    );
  });

  it('rejects contact trigger with empty contacts', () => {
    const form: RuleBuilderFormState = {
      ...validForm,
      triggerType: 'contact',
      triggerConfig: { contacts: '' },
    };
    const result = validateRuleForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'triggerConfig' })
    );
  });

  it('rejects time trigger with no start or end time', () => {
    const form: RuleBuilderFormState = {
      ...validForm,
      triggerType: 'time',
      triggerConfig: { startTime: '', endTime: '' },
    };
    const result = validateRuleForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'triggerConfig' })
    );
  });

  it('accepts time trigger with only start time', () => {
    const form: RuleBuilderFormState = {
      ...validForm,
      triggerType: 'time',
      triggerConfig: { startTime: '09:00', endTime: '' },
    };
    const result = validateRuleForm(form);
    expect(result.isValid).toBe(true);
  });

  it('rejects frequency trigger with empty count', () => {
    const form: RuleBuilderFormState = {
      ...validForm,
      triggerType: 'frequency',
      triggerConfig: { count: '', windowMinutes: '60' },
    };
    const result = validateRuleForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'triggerConfig' })
    );
  });

  it('accepts location trigger without config (placeholder)', () => {
    const form: RuleBuilderFormState = {
      ...validForm,
      triggerType: 'location',
      triggerConfig: {},
    };
    const result = validateRuleForm(form);
    expect(result.isValid).toBe(true);
  });

  it('collects multiple errors at once', () => {
    const form: RuleBuilderFormState = {
      name: '',
      description: '',
      triggerType: null,
      triggerConfig: {},
      conditions: [],
      actions: [],
    };
    const result = validateRuleForm(form);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('allows conditions to be empty (optional)', () => {
    const form: RuleBuilderFormState = {
      ...validForm,
      conditions: [],
    };
    const result = validateRuleForm(form);
    expect(result.isValid).toBe(true);
  });
});
