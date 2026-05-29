import type { ParsedNotification } from '../../../../services/notification/parser';
import type { TriggerHandler, KeywordTriggerConfig } from './types';

/**
 * Keyword trigger handler.
 * Matches if any keyword in config.keywords appears in the notification's title or content.
 */
export class KeywordTriggerHandler implements TriggerHandler {
  evaluate(notification: ParsedNotification, config: Record<string, unknown>): boolean {
    const triggerConfig = config as unknown as KeywordTriggerConfig;

    if (!triggerConfig.keywords || !Array.isArray(triggerConfig.keywords)) {
      return false;
    }

    if (triggerConfig.keywords.length === 0) {
      return false;
    }

    const caseSensitive = triggerConfig.caseSensitive ?? false;

    const title = notification.title ?? '';
    const content = notification.content ?? '';
    const searchText = caseSensitive
      ? `${title} ${content}`
      : `${title} ${content}`.toLowerCase();

    return triggerConfig.keywords.some((keyword) => {
      if (!keyword || typeof keyword !== 'string') {
        return false;
      }
      const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
      return searchText.includes(searchKeyword);
    });
  }
}
