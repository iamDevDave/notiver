import * as fc from 'fast-check';
import { AIClassifier } from './classifier';
import type { ClassificationInput, KeywordDictionary } from './types';
import type { NotificationCategory } from '../../../database/schema/notifications';

/**
 * Property 14: AI Classification Produces Valid Category
 *
 * For any notification content (including empty, whitespace-only, special characters,
 * and very long strings) and any keyword dictionary configuration, the AI classifier
 * must return exactly one category from the valid set: Important, Work, Social, Spam,
 * Promotion, or Emergency — never null, undefined, or an invalid value.
 *
 * **Validates: Requirements 13.1**
 */

// Mock the settings repository
jest.mock('../../../database/repositories', () => ({
  settingsRepository: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

import { settingsRepository } from '../../../database/repositories';

const mockedGet = settingsRepository.get as jest.MockedFunction<
  typeof settingsRepository.get
>;

const VALID_CATEGORIES: NotificationCategory[] = [
  'important',
  'work',
  'social',
  'spam',
  'promotion',
  'emergency',
];

// --- Custom Arbitraries ---

/** Arbitrary for nullable strings including edge cases */
const nullableStringArb: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  fc.constant(''),
  fc.constant(' '),
  fc.constant('   \t\n  '),
  fc.string(),
  fc.stringMatching(/^[!@#$%^&*()<>\/\\]{0,50}$/),
  fc.string({ minLength: 500, maxLength: 2000 })
);

/** Arbitrary for ClassificationInput with diverse content */
const classificationInputArb: fc.Arbitrary<ClassificationInput> = fc.record({
  title: nullableStringArb,
  content: nullableStringArb,
  sender: nullableStringArb,
});

/** Arbitrary for a keyword dictionary with arbitrary keywords per category */
const keywordDictionaryArb: fc.Arbitrary<KeywordDictionary> = fc.record({
  important: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 20 }),
  work: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 20 }),
  social: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 20 }),
  spam: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 20 }),
  promotion: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 20 }),
  emergency: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 20 }),
});

describe('Property 14: AI Classification Produces Valid Category', () => {
  let classifier: AIClassifier;

  beforeEach(() => {
    classifier = new AIClassifier();
    jest.clearAllMocks();
  });

  it('should always return a valid category for arbitrary notification content with a default dictionary', async () => {
    const defaultDictionary: KeywordDictionary = {
      important: ['urgent', 'critical', 'asap'],
      work: ['meeting', 'deadline', 'project'],
      social: ['friend', 'party', 'birthday'],
      spam: ['win', 'prize', 'free'],
      promotion: ['sale', 'discount', 'deal'],
      emergency: ['alert', 'warning', 'danger'],
    };

    mockedGet.mockResolvedValue(JSON.stringify(defaultDictionary));

    await fc.assert(
      fc.asyncProperty(classificationInputArb, async (input) => {
        const result = await classifier.classify(input);

        // Must return exactly one valid category
        expect(VALID_CATEGORIES).toContain(result.category);

        // Category must not be null or undefined
        expect(result.category).not.toBeNull();
        expect(result.category).not.toBeUndefined();

        // Confidence must be a number between 0 and 1
        expect(typeof result.confidence).toBe('number');
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(Number.isNaN(result.confidence)).toBe(false);

        // matchedKeywords must be an array
        expect(Array.isArray(result.matchedKeywords)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('should always return a valid category for arbitrary notification content with an arbitrary dictionary', async () => {
    await fc.assert(
      fc.asyncProperty(
        classificationInputArb,
        keywordDictionaryArb,
        async (input, dictionary) => {
          mockedGet.mockResolvedValue(JSON.stringify(dictionary));

          const result = await classifier.classify(input);

          // Must return exactly one valid category
          expect(VALID_CATEGORIES).toContain(result.category);

          // Category must not be null or undefined
          expect(result.category).not.toBeNull();
          expect(result.category).not.toBeUndefined();

          // Confidence must be a number between 0 and 1
          expect(typeof result.confidence).toBe('number');
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
          expect(Number.isNaN(result.confidence)).toBe(false);

          // matchedKeywords must be an array
          expect(Array.isArray(result.matchedKeywords)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should always return a valid category when the dictionary is empty (null from settings)', async () => {
    mockedGet.mockResolvedValue(null);

    await fc.assert(
      fc.asyncProperty(classificationInputArb, async (input) => {
        const result = await classifier.classify(input);

        expect(VALID_CATEGORIES).toContain(result.category);
        expect(result.category).not.toBeNull();
        expect(result.category).not.toBeUndefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(Array.isArray(result.matchedKeywords)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should always return a valid category when the dictionary is malformed JSON', async () => {
    const malformedValues = [
      'not json at all',
      '{{{invalid',
      '[]',
      '123',
      'null',
      'undefined',
      '',
    ];

    for (const malformed of malformedValues) {
      mockedGet.mockResolvedValue(malformed);

      await fc.assert(
        fc.asyncProperty(classificationInputArb, async (input) => {
          const result = await classifier.classify(input);

          expect(VALID_CATEGORIES).toContain(result.category);
          expect(result.category).not.toBeNull();
          expect(result.category).not.toBeUndefined();
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
          expect(Array.isArray(result.matchedKeywords)).toBe(true);
        }),
        { numRuns: 20 }
      );
    }
  });
});
