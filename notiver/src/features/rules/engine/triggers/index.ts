import type { TriggerType } from './types';
import type { TriggerHandler } from './types';
import { AppTriggerHandler } from './app-trigger';
import { KeywordTriggerHandler } from './keyword-trigger';
import { ContactTriggerHandler } from './contact-trigger';
import { TimeTriggerHandler } from './time-trigger';
import { LocationTriggerHandler } from './location-trigger';
import { FrequencyTriggerHandler } from './frequency-trigger';

export type { TriggerHandler, TriggerType };
export {
  AppTriggerHandler,
  KeywordTriggerHandler,
  ContactTriggerHandler,
  TimeTriggerHandler,
  LocationTriggerHandler,
  FrequencyTriggerHandler,
};

/**
 * Registry mapping TriggerType to its corresponding handler instance.
 * Used by the rule engine to look up the appropriate handler for evaluation.
 */
export const triggerRegistry: Map<TriggerType, TriggerHandler> = new Map([
  ['app', new AppTriggerHandler()],
  ['keyword', new KeywordTriggerHandler()],
  ['contact', new ContactTriggerHandler()],
  ['time', new TimeTriggerHandler()],
  ['location', new LocationTriggerHandler()],
  ['frequency', new FrequencyTriggerHandler()],
]);

/**
 * Retrieves the trigger handler for a given trigger type.
 * @param type - The trigger type to look up
 * @returns The trigger handler, or undefined if not registered
 */
export function getTriggerHandler(type: TriggerType): TriggerHandler | undefined {
  return triggerRegistry.get(type);
}
