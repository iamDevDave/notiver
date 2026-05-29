import { settingsRepository } from '../repositories';

/**
 * Default AI keyword dictionary mapping keywords to notification categories.
 * Stored as a JSON string in the settings table under the key 'ai_keyword_dictionary'.
 */
const DEFAULT_KEYWORD_DICTIONARY: Record<string, string[]> = {
  important: ['urgent', 'emergency', 'critical', 'asap', 'important'],
  work: ['meeting', 'deadline', 'project', 'task', 'office', 'slack', 'teams'],
  social: ['friend', 'party', 'birthday', 'invite', 'hangout'],
  spam: ['win', 'prize', 'congratulations', 'claim', 'free', 'offer'],
  promotion: ['sale', 'discount', 'deal', 'coupon', 'limited', 'offer', 'shop'],
  emergency: ['alert', 'warning', 'danger', 'fire', 'accident', '911'],
};

/**
 * Seeds the default notification categories (AI keyword dictionary) into settings.
 */
export async function seedCategories(): Promise<void> {
  await settingsRepository.set(
    'ai_keyword_dictionary',
    JSON.stringify(DEFAULT_KEYWORD_DICTIONARY)
  );
}
