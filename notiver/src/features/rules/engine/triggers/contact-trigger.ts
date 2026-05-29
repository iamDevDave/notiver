import type { ParsedNotification } from '../../../../services/notification/parser';
import type { TriggerHandler, ContactTriggerConfig } from './types';

/**
 * Contact trigger handler.
 * Matches if the notification's sender matches any contact in the configured contacts array.
 */
export class ContactTriggerHandler implements TriggerHandler {
  evaluate(notification: ParsedNotification, config: Record<string, unknown>): boolean {
    const triggerConfig = config as unknown as ContactTriggerConfig;

    if (!triggerConfig.contacts || !Array.isArray(triggerConfig.contacts)) {
      return false;
    }

    if (triggerConfig.contacts.length === 0) {
      return false;
    }

    if (!notification.sender) {
      return false;
    }

    const senderLower = notification.sender.toLowerCase();

    return triggerConfig.contacts.some(
      (contact) =>
        typeof contact === 'string' && contact.toLowerCase() === senderLower
    );
  }
}
