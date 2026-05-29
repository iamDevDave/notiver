import { create } from 'zustand';
import type { TriggerType } from '../../../database/schema/rules';
import type { ConditionType } from '../engine/conditions/types';
import type { ActionType } from '../engine/actions/types';

/** Wizard step identifiers */
export type WizardStep = 'trigger' | 'conditions' | 'actions' | 'review';

/** All wizard steps in order */
export const WIZARD_STEPS: WizardStep[] = ['trigger', 'conditions', 'actions', 'review'];

/** Step metadata for display */
export const WIZARD_STEP_META: Record<WizardStep, { label: string; index: number }> = {
  trigger: { label: 'Select Trigger', index: 0 },
  conditions: { label: 'Add Conditions', index: 1 },
  actions: { label: 'Add Actions', index: 2 },
  review: { label: 'Review', index: 3 },
};

/** Condition entry in the builder form */
export interface BuilderCondition {
  id: string;
  type: ConditionType;
  config: {
    operator: string;
    value: string;
    field?: string;
  };
  logicOperator: 'AND' | 'OR';
}

/** Action entry in the builder form */
export interface BuilderAction {
  id: string;
  type: ActionType;
  config: Record<string, unknown>;
}

/** Complete rule builder form state */
export interface RuleBuilderFormState {
  name: string;
  description: string;
  triggerType: TriggerType | null;
  triggerConfig: Record<string, unknown>;
  conditions: BuilderCondition[];
  actions: BuilderAction[];
}

/** Rule builder store state and actions */
export interface RuleBuilderStore {
  // Wizard navigation state
  currentStep: WizardStep;
  isOpen: boolean;

  // Form state
  form: RuleBuilderFormState;

  // Navigation actions
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  open: () => void;
  close: () => void;

  // Form actions
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setTriggerType: (type: TriggerType) => void;
  setTriggerConfig: (config: Record<string, unknown>) => void;
  addCondition: (condition: BuilderCondition) => void;
  updateCondition: (id: string, updates: Partial<BuilderCondition>) => void;
  removeCondition: (id: string) => void;
  reorderCondition: (id: string, direction: 'up' | 'down') => void;
  addAction: (action: BuilderAction) => void;
  updateAction: (id: string, updates: Partial<BuilderAction>) => void;
  removeAction: (id: string) => void;
  reorderAction: (id: string, direction: 'up' | 'down') => void;

  // Reset
  reset: () => void;
}

const initialFormState: RuleBuilderFormState = {
  name: '',
  description: '',
  triggerType: null,
  triggerConfig: {},
  conditions: [],
  actions: [],
};

export const useRuleBuilderStore = create<RuleBuilderStore>((set, get) => ({
  // Initial state
  currentStep: 'trigger',
  isOpen: false,
  form: { ...initialFormState },

  // Navigation actions
  setStep: (step) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep } = get();
    const currentIndex = WIZARD_STEPS.indexOf(currentStep);
    if (currentIndex < WIZARD_STEPS.length - 1) {
      set({ currentStep: WIZARD_STEPS[currentIndex + 1] });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    const currentIndex = WIZARD_STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      set({ currentStep: WIZARD_STEPS[currentIndex - 1] });
    }
  },

  open: () => set({ isOpen: true }),

  close: () => set({ isOpen: false, currentStep: 'trigger', form: { ...initialFormState } }),

  // Form actions
  setName: (name) => set((state) => ({ form: { ...state.form, name } })),

  setDescription: (description) =>
    set((state) => ({ form: { ...state.form, description } })),

  setTriggerType: (type) =>
    set((state) => ({ form: { ...state.form, triggerType: type, triggerConfig: {} } })),

  setTriggerConfig: (config) =>
    set((state) => ({ form: { ...state.form, triggerConfig: config } })),

  addCondition: (condition) =>
    set((state) => ({
      form: { ...state.form, conditions: [...state.form.conditions, condition] },
    })),

  updateCondition: (id, updates) =>
    set((state) => ({
      form: {
        ...state.form,
        conditions: state.form.conditions.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      },
    })),

  removeCondition: (id) =>
    set((state) => ({
      form: {
        ...state.form,
        conditions: state.form.conditions.filter((c) => c.id !== id),
      },
    })),

  reorderCondition: (id, direction) =>
    set((state) => {
      const conditions = [...state.form.conditions];
      const index = conditions.findIndex((c) => c.id === id);
      if (index === -1) return state;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= conditions.length) return state;
      [conditions[index], conditions[newIndex]] = [conditions[newIndex], conditions[index]];
      return { form: { ...state.form, conditions } };
    }),

  addAction: (action) =>
    set((state) => ({
      form: { ...state.form, actions: [...state.form.actions, action] },
    })),

  updateAction: (id, updates) =>
    set((state) => ({
      form: {
        ...state.form,
        actions: state.form.actions.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
      },
    })),

  removeAction: (id) =>
    set((state) => ({
      form: {
        ...state.form,
        actions: state.form.actions.filter((a) => a.id !== id),
      },
    })),

  reorderAction: (id, direction) =>
    set((state) => {
      const actions = [...state.form.actions];
      const index = actions.findIndex((a) => a.id === id);
      if (index === -1) return state;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= actions.length) return state;
      [actions[index], actions[newIndex]] = [actions[newIndex], actions[index]];
      return { form: { ...state.form, actions } };
    }),

  // Reset
  reset: () => set({ currentStep: 'trigger', form: { ...initialFormState } }),
}));
