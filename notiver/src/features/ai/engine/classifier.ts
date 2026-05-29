import type { NotificationCategory } from '../../../database/schema/notifications';
import { settingsRepository } from '../../../database/repositories';
import type {
  IAIClassifier,
  ClassificationInput,
  ClassificationResult,
  KeywordDictionary,
} from './types';

const KEYWORD_DICTIONARY_KEY = 'ai_keyword_dictionary';

const DEFAULT_CATEGORY: NotificationCategory = 'social';
const DEFAULT_CONFIDENCE = 0.1;

const VALID_CATEGORIES: NotificationCategory[] = [
  'important',
  'work',
  'social',
  'spam',
  'promotion',
  'emergency',
];

/**
 * Keyword-based AI classifier that categorizes notifications by matching
 * keywords against notification title, content, and sender fields.
 *
 * Algorithm:
 * 1. Load keyword dictionary from settings repository
 * 2. Combine title + content + sender into searchable text (lowercase)
 * 3. For each category, count keyword matches
 * 4. Category with most matches wins
 * 5. Confidence = matchCount / totalKeywordsInCategory (capped at 1.0)
 * 6. If no matches, default to 'social' with confidence 0.1
 * 7. Always returns exactly one valid category
 */
export class AIClassifier implements IAIClassifier {
  /**
   * Classify a notification based on keyword matching.
   * Always returns exactly one valid category with a confidence score.
   */
  async classify(notification: ClassificationInput): Promise<ClassificationResult> {
    const dictionary = await this.getKeywordDictionary();
    const text = this.buildSearchText(notification);

    let bestCategory: NotificationCategory = DEFAULT_CATEGORY;
    let bestMatchCount = 0;
    let bestMatchedKeywords: string[] = [];
    let bestTotalKeywords = 0;

    for (const category of VALID_CATEGORIES) {
      const keywords = dictionary[category] ?? [];
      if (keywords.length === 0) continue;

      const matched = keywords.filter((keyword) =>
        text.includes(keyword.toLowerCase())
      );

      if (matched.length > bestMatchCount) {
        bestCategory = category;
        bestMatchCount = matched.length;
        bestMatchedKeywords = matched;
        bestTotalKeywords = keywords.length;
      }
    }

    if (bestMatchCount === 0) {
      return {
        category: DEFAULT_CATEGORY,
        confidence: DEFAULT_CONFIDENCE,
        matchedKeywords: [],
      };
    }

    const confidence = Math.min(bestMatchCount / bestTotalKeywords, 1.0);

    return {
      category: bestCategory,
      confidence,
      matchedKeywords: bestMatchedKeywords,
    };
  }

  /**
   * Update the keywords for a specific category in the dictionary.
   */
  async updateKeywords(
    category: NotificationCategory,
    keywords: string[]
  ): Promise<void> {
    const dictionary = await this.getKeywordDictionary();
    dictionary[category] = keywords;
    await settingsRepository.set(
      KEYWORD_DICTIONARY_KEY,
      JSON.stringify(dictionary)
    );
  }

  /**
   * Retrieve the current keyword dictionary from settings.
   * Returns a complete dictionary with all categories (empty arrays for missing ones).
   */
  async getKeywordDictionary(): Promise<KeywordDictionary> {
    const raw = await settingsRepository.get(KEYWORD_DICTIONARY_KEY);

    const emptyDictionary: KeywordDictionary = {
      important: [],
      work: [],
      social: [],
      spam: [],
      promotion: [],
      emergency: [],
    };

    if (!raw) {
      return emptyDictionary;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<KeywordDictionary>;
      // Ensure all categories exist with at least an empty array
      for (const category of VALID_CATEGORIES) {
        if (!Array.isArray(parsed[category])) {
          parsed[category] = [];
        }
      }
      return parsed as KeywordDictionary;
    } catch {
      return emptyDictionary;
    }
  }

  /**
   * Combine notification fields into a single lowercase searchable string.
   */
  private buildSearchText(notification: ClassificationInput): string {
    const parts: string[] = [];
    if (notification.title) parts.push(notification.title);
    if (notification.content) parts.push(notification.content);
    if (notification.sender) parts.push(notification.sender);
    return parts.join(' ').toLowerCase();
  }
}
