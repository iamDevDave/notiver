import type { TriggerType } from '../../../database/schema/rules';
import type { BuilderCondition, BuilderAction, RuleBuilderFormState } from '../store/rule-builder-store';

/**
 * Generates a natural language summary of a rule configuration.
 * Example: "When I get a notification from WhatsApp that contains 'urgent' at any time, sound an alarm"
 */
export function generateRuleSummary(form: RuleBuilderFormState): string {
  const triggerText = getTriggerText(form.triggerType, form.triggerConfig);
  const conditionsText = getConditionsText(form.conditions);
  const actionsText = getActionsText(form.actions);

  let summary = `When I get a notification ${triggerText}`;

  if (conditionsText) {
    summary += ` ${conditionsText}`;
  }

  summary += `, ${actionsText}`;

  return summary;
}

function getTriggerText(
  triggerType: TriggerType | null,
  triggerConfig: Record<string, unknown>
): string {
  if (!triggerType) return 'from any source';

  switch (triggerType) {
    case 'app': {
      const packageNames = (triggerConfig.packageNames as string) ?? '';
      if (!packageNames.trim()) return 'from any app';
      const apps = packageNames
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (apps.length === 1) return `from ${formatAppName(apps[0])}`;
      if (apps.length === 2) return `from ${formatAppName(apps[0])} or ${formatAppName(apps[1])}`;
      return `from ${apps.slice(0, -1).map(formatAppName).join(', ')}, or ${formatAppName(apps[apps.length - 1])}`;
    }
    case 'keyword': {
      const keywords = (triggerConfig.keywords as string) ?? '';
      if (!keywords.trim()) return 'containing any keyword';
      const words = keywords
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (words.length === 1) return `containing '${words[0]}'`;
      return `containing ${words.map((w) => `'${w}'`).join(' or ')}`;
    }
    case 'contact': {
      const contacts = (triggerConfig.contacts as string) ?? '';
      if (!contacts.trim()) return 'from any contact';
      const names = contacts
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (names.length === 1) return `from ${names[0]}`;
      return `from ${names.join(' or ')}`;
    }
    case 'time': {
      const startTime = (triggerConfig.startTime as string) ?? '';
      const endTime = (triggerConfig.endTime as string) ?? '';
      if (!startTime && !endTime) return 'at any time';
      if (startTime && endTime) return `between ${startTime} and ${endTime}`;
      if (startTime) return `after ${startTime}`;
      return `before ${endTime}`;
    }
    case 'location':
      return 'at a specific location';
    case 'frequency': {
      const count = (triggerConfig.count as string) ?? '';
      const windowMinutes = (triggerConfig.windowMinutes as string) ?? '';
      if (!count) return 'when notifications are frequent';
      if (windowMinutes) {
        return `when more than ${count} arrive within ${windowMinutes} minutes`;
      }
      return `when more than ${count} arrive`;
    }
    default:
      return 'from any source';
  }
}

function getConditionsText(conditions: BuilderCondition[]): string {
  if (conditions.length === 0) return '';

  const parts = conditions.map((condition, index) => {
    const text = getConditionText(condition);
    if (index === 0) return text;
    return `${condition.logicOperator.toLowerCase()} ${text}`;
  });

  return `that ${parts.join(' ')}`;
}

function getConditionText(condition: BuilderCondition): string {
  const { type, config } = condition;

  switch (type) {
    case 'contains':
      if (!config.value) return 'contains something';
      return `${config.field ?? 'content'} contains '${config.value}'`;
    case 'not_contains':
      if (!config.value) return 'does not contain something';
      return `${config.field ?? 'content'} does not contain '${config.value}'`;
    case 'regex':
      if (!config.value) return 'matches a pattern';
      return `${config.field ?? 'content'} matches /${config.value}/`;
    case 'category':
      if (!config.value) return 'is in a category';
      return `is categorized as ${config.value}`;
    case 'priority': {
      if (!config.value) return 'has a priority level';
      const opLabel = getPriorityOperatorLabel(config.operator);
      return `priority ${opLabel} ${config.value}`;
    }
    case 'time_window': {
      const parts = config.value.split('-');
      if (!parts[0] && !parts[1]) return 'is within a time window';
      return `arrives between ${parts[0] || '??:??'} and ${parts[1] || '??:??'}`;
    }
    default:
      return 'meets a condition';
  }
}

function getPriorityOperatorLabel(operator: string): string {
  switch (operator) {
    case '==': return 'equals';
    case '>=': return 'is at least';
    case '<=': return 'is at most';
    case '>': return 'is greater than';
    case '<': return 'is less than';
    default: return operator;
  }
}

function getActionsText(actions: BuilderAction[]): string {
  if (actions.length === 0) return 'do nothing';

  const actionTexts = actions.map(getActionText);

  if (actionTexts.length === 1) return actionTexts[0];
  if (actionTexts.length === 2) return `${actionTexts[0]} and ${actionTexts[1]}`;
  return `${actionTexts.slice(0, -1).join(', ')}, and ${actionTexts[actionTexts.length - 1]}`;
}

function getActionText(action: BuilderAction): string {
  const config = action.config;

  switch (action.type) {
    case 'dismiss':
      return 'dismiss it';
    case 'delay':
      return config.delayMinutes ? `delay it for ${config.delayMinutes} minutes` : 'delay it';
    case 'alarm':
      return 'sound an alarm';
    case 'vibrate': {
      const pattern = config.pattern as string | undefined;
      return pattern ? `vibrate (${pattern})` : 'vibrate';
    }
    case 'reply':
      return config.message ? `auto-reply with "${String(config.message).slice(0, 30)}"` : 'auto-reply';
    case 'launch_app':
      return config.packageName ? `open ${formatAppName(String(config.packageName))}` : 'open an app';
    case 'batch':
      return 'batch similar notifications';
    case 'webhook':
      return 'send to webhook';
    case 'copy':
      return `copy ${config.field ?? 'content'} to clipboard`;
    case 'speak':
      return 'read it aloud';
    default:
      return 'perform an action';
  }
}

/** Formats a package name into a more readable app name */
function formatAppName(packageName: string): string {
  // If it looks like a package name (has dots), extract the last part
  if (packageName.includes('.')) {
    const parts = packageName.split('.');
    const lastPart = parts[parts.length - 1];
    // Capitalize first letter
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
  }
  return packageName;
}
