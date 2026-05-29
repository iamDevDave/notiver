import { generateRuleSummary } from './rule-summary';
import type { RuleBuilderFormState } from '../store/rule-builder-store';

describe('generateRuleSummary', () => {
  const baseForm: RuleBuilderFormState = {
    name: 'Test Rule',
    description: '',
    triggerType: null,
    triggerConfig: {},
    conditions: [],
    actions: [],
  };

  it('generates summary for app trigger with alarm action', () => {
    const form: RuleBuilderFormState = {
      ...baseForm,
      triggerType: 'app',
      triggerConfig: { packageNames: 'com.whatsapp' },
      actions: [{ id: '1', type: 'alarm', config: { durationSeconds: '5' } }],
    };

    const summary = generateRuleSummary(form);
    expect(summary).toBe(
      "When I get a notification from Whatsapp, sound an alarm"
    );
  });

  it('generates summary for keyword trigger with conditions', () => {
    const form: RuleBuilderFormState = {
      ...baseForm,
      triggerType: 'keyword',
      triggerConfig: { keywords: 'urgent' },
      conditions: [
        {
          id: '1',
          type: 'contains',
          config: { operator: 'contains', value: 'payment', field: 'content' },
          logicOperator: 'AND',
        },
      ],
      actions: [{ id: '1', type: 'dismiss', config: {} }],
    };

    const summary = generateRuleSummary(form);
    expect(summary).toBe(
      "When I get a notification containing 'urgent' that content contains 'payment', dismiss it"
    );
  });

  it('generates summary for contact trigger with multiple actions', () => {
    const form: RuleBuilderFormState = {
      ...baseForm,
      triggerType: 'contact',
      triggerConfig: { contacts: 'John, Jane' },
      actions: [
        { id: '1', type: 'alarm', config: {} },
        { id: '2', type: 'copy', config: { field: 'content' } },
      ],
    };

    const summary = generateRuleSummary(form);
    expect(summary).toBe(
      "When I get a notification from John or Jane, sound an alarm and copy content to clipboard"
    );
  });

  it('generates summary for time trigger', () => {
    const form: RuleBuilderFormState = {
      ...baseForm,
      triggerType: 'time',
      triggerConfig: { startTime: '09:00', endTime: '17:00' },
      actions: [{ id: '1', type: 'vibrate', config: { pattern: 'short' } }],
    };

    const summary = generateRuleSummary(form);
    expect(summary).toBe(
      "When I get a notification between 09:00 and 17:00, vibrate (short)"
    );
  });

  it('generates summary for frequency trigger', () => {
    const form: RuleBuilderFormState = {
      ...baseForm,
      triggerType: 'frequency',
      triggerConfig: { count: '10', windowMinutes: '30' },
      actions: [{ id: '1', type: 'batch', config: {} }],
    };

    const summary = generateRuleSummary(form);
    expect(summary).toBe(
      "When I get a notification when more than 10 arrive within 30 minutes, batch similar notifications"
    );
  });

  it('generates summary with multiple conditions using AND/OR', () => {
    const form: RuleBuilderFormState = {
      ...baseForm,
      triggerType: 'app',
      triggerConfig: { packageNames: 'com.slack' },
      conditions: [
        {
          id: '1',
          type: 'contains',
          config: { operator: 'contains', value: 'deploy', field: 'title' },
          logicOperator: 'AND',
        },
        {
          id: '2',
          type: 'priority',
          config: { operator: '>=', value: '3', field: undefined },
          logicOperator: 'OR',
        },
      ],
      actions: [{ id: '1', type: 'speak', config: {} }],
    };

    const summary = generateRuleSummary(form);
    expect(summary).toBe(
      "When I get a notification from Slack that title contains 'deploy' or priority is at least 3, read it aloud"
    );
  });

  it('handles empty trigger config gracefully', () => {
    const form: RuleBuilderFormState = {
      ...baseForm,
      triggerType: 'app',
      triggerConfig: {},
      actions: [{ id: '1', type: 'dismiss', config: {} }],
    };

    const summary = generateRuleSummary(form);
    expect(summary).toBe(
      "When I get a notification from any app, dismiss it"
    );
  });

  it('handles null trigger type', () => {
    const form: RuleBuilderFormState = {
      ...baseForm,
      triggerType: null,
      triggerConfig: {},
      actions: [],
    };

    const summary = generateRuleSummary(form);
    expect(summary).toBe(
      "When I get a notification from any source, do nothing"
    );
  });

  it('generates summary with multiple apps', () => {
    const form: RuleBuilderFormState = {
      ...baseForm,
      triggerType: 'app',
      triggerConfig: { packageNames: 'com.whatsapp, com.telegram, com.signal' },
      actions: [{ id: '1', type: 'alarm', config: {} }],
    };

    const summary = generateRuleSummary(form);
    expect(summary).toBe(
      "When I get a notification from Whatsapp, Telegram, or Signal, sound an alarm"
    );
  });
});
