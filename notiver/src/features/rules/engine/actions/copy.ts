import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ActionExecutor, ActionResult } from './types';

/**
 * Copy action executor.
 * Copies notification content to the device clipboard.
 *
 * Uses the React Native Clipboard API. Falls back to logging if unavailable.
 *
 * Config:
 * - field: 'title' | 'content' | 'sender' | 'all' — which field to copy (default: 'content')
 * - template: string — optional template with placeholders: {title}, {content}, {sender}, {app}
 */
export const copyExecutor: ActionExecutor = {
  async execute(notification: ParsedNotification, config: Record<string, unknown>): Promise<ActionResult> {
    const field = typeof config.field === 'string' ? config.field : 'content';
    const template = typeof config.template === 'string' ? config.template : '';

    let textToCopy: string;

    if (template) {
      textToCopy = template
        .replace('{title}', notification.title ?? '')
        .replace('{content}', notification.content ?? '')
        .replace('{sender}', notification.sender ?? '')
        .replace('{app}', notification.appName);
    } else {
      switch (field) {
        case 'title':
          textToCopy = notification.title ?? '';
          break;
        case 'sender':
          textToCopy = notification.sender ?? '';
          break;
        case 'all':
          textToCopy = [
            notification.title,
            notification.content,
            notification.sender ? `From: ${notification.sender}` : null,
          ]
            .filter(Boolean)
            .join('\n');
          break;
        case 'content':
        default:
          textToCopy = notification.content ?? '';
          break;
      }
    }

    if (!textToCopy) {
      return { success: false, error: 'Nothing to copy — field is empty' };
    }

    try {
      const { Clipboard } = require('react-native');
      Clipboard.setString(textToCopy);
      console.log(`[Action:Copy] Copied ${field} to clipboard (${textToCopy.length} chars)`);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown clipboard error';
      console.warn(`[Action:Copy] Clipboard unavailable: ${message}`);
      return { success: false, error: message };
    }
  },
};
