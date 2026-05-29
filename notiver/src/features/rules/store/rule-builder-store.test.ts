import { useRuleBuilderStore } from './rule-builder-store';
import type { BuilderCondition, BuilderAction } from './rule-builder-store';

// Reset store between tests
beforeEach(() => {
  useRuleBuilderStore.getState().reset();
});

describe('RuleBuilderStore', () => {
  describe('wizard navigation', () => {
    it('starts on the trigger step', () => {
      expect(useRuleBuilderStore.getState().currentStep).toBe('trigger');
    });

    it('navigates to next step', () => {
      useRuleBuilderStore.getState().nextStep();
      expect(useRuleBuilderStore.getState().currentStep).toBe('conditions');
    });

    it('navigates through all steps in order', () => {
      useRuleBuilderStore.getState().nextStep();
      expect(useRuleBuilderStore.getState().currentStep).toBe('conditions');

      useRuleBuilderStore.getState().nextStep();
      expect(useRuleBuilderStore.getState().currentStep).toBe('actions');

      useRuleBuilderStore.getState().nextStep();
      expect(useRuleBuilderStore.getState().currentStep).toBe('review');
    });

    it('does not go past the last step', () => {
      useRuleBuilderStore.getState().setStep('review');
      useRuleBuilderStore.getState().nextStep();
      expect(useRuleBuilderStore.getState().currentStep).toBe('review');
    });

    it('navigates to previous step', () => {
      useRuleBuilderStore.getState().setStep('conditions');
      useRuleBuilderStore.getState().prevStep();
      expect(useRuleBuilderStore.getState().currentStep).toBe('trigger');
    });

    it('does not go before the first step', () => {
      useRuleBuilderStore.getState().prevStep();
      expect(useRuleBuilderStore.getState().currentStep).toBe('trigger');
    });

    it('can jump to a specific step', () => {
      useRuleBuilderStore.getState().setStep('actions');
      expect(useRuleBuilderStore.getState().currentStep).toBe('actions');
    });
  });

  describe('open/close', () => {
    it('opens the wizard', () => {
      useRuleBuilderStore.getState().open();
      expect(useRuleBuilderStore.getState().isOpen).toBe(true);
    });

    it('closes and resets the wizard', () => {
      const store = useRuleBuilderStore.getState();
      store.open();
      store.setName('Test Rule');
      store.setStep('actions');

      useRuleBuilderStore.getState().close();

      const state = useRuleBuilderStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.currentStep).toBe('trigger');
      expect(state.form.name).toBe('');
    });
  });

  describe('form state - trigger', () => {
    it('sets trigger type', () => {
      useRuleBuilderStore.getState().setTriggerType('keyword');
      expect(useRuleBuilderStore.getState().form.triggerType).toBe('keyword');
    });

    it('resets trigger config when trigger type changes', () => {
      useRuleBuilderStore.getState().setTriggerType('app');
      useRuleBuilderStore.getState().setTriggerConfig({ apps: ['com.example'] });
      useRuleBuilderStore.getState().setTriggerType('keyword');

      const state = useRuleBuilderStore.getState();
      expect(state.form.triggerType).toBe('keyword');
      expect(state.form.triggerConfig).toEqual({});
    });

    it('sets trigger config', () => {
      useRuleBuilderStore.getState().setTriggerConfig({ keywords: ['urgent'] });
      expect(useRuleBuilderStore.getState().form.triggerConfig).toEqual({
        keywords: ['urgent'],
      });
    });
  });

  describe('form state - name and description', () => {
    it('sets rule name', () => {
      useRuleBuilderStore.getState().setName('My Rule');
      expect(useRuleBuilderStore.getState().form.name).toBe('My Rule');
    });

    it('sets rule description', () => {
      useRuleBuilderStore.getState().setDescription('A test rule');
      expect(useRuleBuilderStore.getState().form.description).toBe('A test rule');
    });
  });

  describe('form state - conditions', () => {
    const mockCondition: BuilderCondition = {
      id: 'cond_1',
      type: 'contains',
      config: { operator: 'contains', value: 'urgent' },
      logicOperator: 'AND',
    };

    it('adds a condition', () => {
      useRuleBuilderStore.getState().addCondition(mockCondition);
      expect(useRuleBuilderStore.getState().form.conditions).toHaveLength(1);
      expect(useRuleBuilderStore.getState().form.conditions[0]).toEqual(mockCondition);
    });

    it('updates a condition', () => {
      useRuleBuilderStore.getState().addCondition(mockCondition);
      useRuleBuilderStore.getState().updateCondition('cond_1', {
        config: { operator: 'contains', value: 'important' },
      });

      expect(useRuleBuilderStore.getState().form.conditions[0].config.value).toBe(
        'important'
      );
    });

    it('removes a condition', () => {
      useRuleBuilderStore.getState().addCondition(mockCondition);
      useRuleBuilderStore.getState().removeCondition('cond_1');
      expect(useRuleBuilderStore.getState().form.conditions).toHaveLength(0);
    });

    it('handles multiple conditions', () => {
      const cond2: BuilderCondition = {
        id: 'cond_2',
        type: 'priority',
        config: { operator: '>=', value: '3' },
        logicOperator: 'OR',
      };

      useRuleBuilderStore.getState().addCondition(mockCondition);
      useRuleBuilderStore.getState().addCondition(cond2);

      expect(useRuleBuilderStore.getState().form.conditions).toHaveLength(2);
    });
  });

  describe('form state - actions', () => {
    const mockAction: BuilderAction = {
      id: 'act_1',
      type: 'dismiss',
      config: {},
    };

    it('adds an action', () => {
      useRuleBuilderStore.getState().addAction(mockAction);
      expect(useRuleBuilderStore.getState().form.actions).toHaveLength(1);
      expect(useRuleBuilderStore.getState().form.actions[0]).toEqual(mockAction);
    });

    it('updates an action', () => {
      useRuleBuilderStore.getState().addAction(mockAction);
      useRuleBuilderStore.getState().updateAction('act_1', {
        config: { delay: 5000 },
      });

      expect(useRuleBuilderStore.getState().form.actions[0].config).toEqual({
        delay: 5000,
      });
    });

    it('removes an action', () => {
      useRuleBuilderStore.getState().addAction(mockAction);
      useRuleBuilderStore.getState().removeAction('act_1');
      expect(useRuleBuilderStore.getState().form.actions).toHaveLength(0);
    });
  });

  describe('reset', () => {
    it('resets all form state and navigation', () => {
      const store = useRuleBuilderStore.getState();
      store.setName('Test');
      store.setDescription('Desc');
      store.setTriggerType('app');
      store.setTriggerConfig({ apps: ['com.test'] });
      store.addCondition({
        id: 'c1',
        type: 'contains',
        config: { operator: 'contains', value: 'x' },
        logicOperator: 'AND',
      });
      store.addAction({ id: 'a1', type: 'dismiss', config: {} });
      store.setStep('review');

      useRuleBuilderStore.getState().reset();

      const state = useRuleBuilderStore.getState();
      expect(state.currentStep).toBe('trigger');
      expect(state.form.name).toBe('');
      expect(state.form.description).toBe('');
      expect(state.form.triggerType).toBeNull();
      expect(state.form.triggerConfig).toEqual({});
      expect(state.form.conditions).toHaveLength(0);
      expect(state.form.actions).toHaveLength(0);
    });
  });
});
