/**
 * Property 15: Keyword Dictionary Update Round-Trip
 *
 * For any valid keyword dictionary update (adding keywords to a category,
 * removing keywords, replacing the dictionary), reading the dictionary back
 * should reflect exactly the changes made, with no unintended modifications
 * to other categories.
 *
 * **Validates: Requirements 13.2**
 */
import * as fc from 'fast-check';
import { AIClassifier } from './classifier';
import type { KeywordDictionary } from './types';
import type { NotificationCategory } from '../../../database/schema/notifications';

// Mock the settings repository with an in-memory store
jest.mock('../../../database/repositories', () => {
  let store: Record<string, string> = {};
  return {
    settingsRepository: {
      get: jest.fn(async (key: string) => store[key] ?? null),
      set: jest.fn(async (key: string, value: string) => {
        store[key] = value;
      }),
      __reset: () => {
        store = {};
      },
      __getStore: () => store,
    },
  };
});

import { settingsRepository } from '../../../database/repositories';

const VALID_CATEGORIES: NotificationCategory[] = [
  'important',
  'work',
  'social',
  'spam',
  'promotion',
  'emergency',
];

// Arbitrary: generate a valid keyword (non-empty alphanumeric string)
const arbKeyword = fc.string({ minLength: 1, maxLength: 20 }).map(
  (s) => s.replace(/[\s"\\]/g, 'a') || 'keyword'
);

// Arbitrary: generate a list of keywords for a category
const arbKeywordList = fc.array(arbKeyword, { minLength: 0, maxLength: 15 });

// Arbitrary: generate a valid category
const arbCategory = fc.constantFrom(...VALID_CATEGORIES);

// Arbitrary: generate a full keyword dictionary
const arbKeywordDictionary: fc.Arbitrary<KeywordDictionary> = fc.record({
  important: arbKeywordList,
  work: arbKeywordList,
  social: arbKeywordList,
  spam: arbKeywordList,
  promotion: arbKeywordList,
  emergency: arbKeywordList,
});

describe('Property 15: Keyword Dictionary Update Round-Trip', () => {
  let classifier: AIClassifier;

  beforeEach(() => {
    classifier = new AIClassifier();
    // Reset the in-memory store
    (settingsRepository as unknown as { __reset: () => void }).__reset();
  });

  it('updateKeywords for a single category preserves all other categories', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbKeywordDictionary,
        arbCategory,
        arbKeywordList,
        async (initialDictionary, targetCategory, newKeywords) => {
          // Setup: seed the initial dictionary
          (settingsRepository as unknown as { __reset: () => void }).__reset();
          await (settingsRepository.set as jest.Mock)(
            'ai_keyword_dictionary',
            JSON.stringify(initialDictionary)
          );

          // Act: update a single category
          await classifier.updateKeywords(targetCategory, newKeywords);

          // Assert: read back the dictionary
          const result = await classifier.getKeywordDictionary();

          // The target category should have the new keywords
          expect(result[targetCategory]).toEqual(newKeywords);

          // All other categories should remain unchanged
          for (const category of VALID_CATEGORIES) {
            if (category !== targetCategory) {
              expect(result[category]).toEqual(initialDictionary[category]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sequential updates to different categories are all reflected correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.tuple(arbCategory, arbKeywordList),
          { minLength: 1, maxLength: 6 }
        ),
        async (updates) => {
          // Setup: start with empty dictionary
          (settingsRepository as unknown as { __reset: () => void }).__reset();

          // Act: apply all updates sequentially
          for (const [category, keywords] of updates) {
            await classifier.updateKeywords(category, keywords);
          }

          // Assert: the final dictionary should reflect the last update for each category
          const result = await classifier.getKeywordDictionary();

          // Build expected state: last update per category wins
          const expectedUpdates = new Map<NotificationCategory, string[]>();
          for (const [category, keywords] of updates) {
            expectedUpdates.set(category, keywords);
          }

          for (const category of VALID_CATEGORIES) {
            if (expectedUpdates.has(category)) {
              expect(result[category]).toEqual(expectedUpdates.get(category));
            } else {
              // Categories never updated should be empty arrays
              expect(result[category]).toEqual([]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('replacing entire dictionary via sequential updates produces exact expected state', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbKeywordDictionary,
        arbKeywordDictionary,
        async (initialDictionary, replacementDictionary) => {
          // Setup: seed initial dictionary
          (settingsRepository as unknown as { __reset: () => void }).__reset();
          await (settingsRepository.set as jest.Mock)(
            'ai_keyword_dictionary',
            JSON.stringify(initialDictionary)
          );

          // Act: replace all categories
          for (const category of VALID_CATEGORIES) {
            await classifier.updateKeywords(category, replacementDictionary[category]);
          }

          // Assert: dictionary should exactly match the replacement
          const result = await classifier.getKeywordDictionary();
          for (const category of VALID_CATEGORIES) {
            expect(result[category]).toEqual(replacementDictionary[category]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getKeywordDictionary always returns all six categories with arrays', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbKeywordDictionary,
        async (dictionary) => {
          // Setup: store arbitrary dictionary
          (settingsRepository as unknown as { __reset: () => void }).__reset();
          await (settingsRepository.set as jest.Mock)(
            'ai_keyword_dictionary',
            JSON.stringify(dictionary)
          );

          // Act
          const result = await classifier.getKeywordDictionary();

          // Assert: all categories present and are arrays
          for (const category of VALID_CATEGORIES) {
            expect(Array.isArray(result[category])).toBe(true);
          }

          // Assert: result matches what was stored
          for (const category of VALID_CATEGORIES) {
            expect(result[category]).toEqual(dictionary[category]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('removing keywords (setting empty array) does not affect other categories', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbKeywordDictionary,
        arbCategory,
        async (initialDictionary, targetCategory) => {
          // Setup: seed initial dictionary with data
          (settingsRepository as unknown as { __reset: () => void }).__reset();
          await (settingsRepository.set as jest.Mock)(
            'ai_keyword_dictionary',
            JSON.stringify(initialDictionary)
          );

          // Act: remove all keywords from target category
          await classifier.updateKeywords(targetCategory, []);

          // Assert
          const result = await classifier.getKeywordDictionary();

          // Target category should be empty
          expect(result[targetCategory]).toEqual([]);

          // Other categories unchanged
          for (const category of VALID_CATEGORIES) {
            if (category !== targetCategory) {
              expect(result[category]).toEqual(initialDictionary[category]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
