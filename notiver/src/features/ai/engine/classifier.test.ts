import { AIClassifier } from './classifier';
import type { ClassificationInput, KeywordDictionary } from './types';

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
const mockedSet = settingsRepository.set as jest.MockedFunction<
  typeof settingsRepository.set
>;

const DEFAULT_DICTIONARY: KeywordDictionary = {
  important: ['urgent', 'emergency', 'critical', 'asap', 'important'],
  work: ['meeting', 'deadline', 'project', 'task', 'office', 'slack', 'teams'],
  social: ['friend', 'party', 'birthday', 'invite', 'hangout'],
  spam: ['win', 'prize', 'congratulations', 'claim', 'free', 'offer'],
  promotion: ['sale', 'discount', 'deal', 'coupon', 'limited', 'offer', 'shop'],
  emergency: ['alert', 'warning', 'danger', 'fire', 'accident', '911'],
};

describe('AIClassifier', () => {
  let classifier: AIClassifier;

  beforeEach(() => {
    classifier = new AIClassifier();
    jest.clearAllMocks();
    mockedGet.mockResolvedValue(JSON.stringify(DEFAULT_DICTIONARY));
  });

  describe('classify()', () => {
    it('should classify a notification with matching keywords in title', async () => {
      const notification: ClassificationInput = {
        title: 'Urgent: Server is down',
        content: null,
        sender: null,
      };

      const result = await classifier.classify(notification);

      expect(result.category).toBe('important');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.matchedKeywords).toContain('urgent');
    });

    it('should classify based on content field', async () => {
      const notification: ClassificationInput = {
        title: 'New message',
        content: 'Hey, the meeting is at 3pm and the deadline is tomorrow',
        sender: null,
      };

      const result = await classifier.classify(notification);

      expect(result.category).toBe('work');
      expect(result.matchedKeywords).toContain('meeting');
      expect(result.matchedKeywords).toContain('deadline');
    });

    it('should classify based on sender field', async () => {
      const notification: ClassificationInput = {
        title: 'Notification',
        content: null,
        sender: 'Slack Workspace',
      };

      const result = await classifier.classify(notification);

      expect(result.category).toBe('work');
      expect(result.matchedKeywords).toContain('slack');
    });

    it('should return default category social with low confidence when no keywords match', async () => {
      const notification: ClassificationInput = {
        title: 'Hello there',
        content: 'Just checking in',
        sender: 'John',
      };

      const result = await classifier.classify(notification);

      expect(result.category).toBe('social');
      expect(result.confidence).toBe(0.1);
      expect(result.matchedKeywords).toEqual([]);
    });

    it('should handle all null fields gracefully', async () => {
      const notification: ClassificationInput = {
        title: null,
        content: null,
        sender: null,
      };

      const result = await classifier.classify(notification);

      expect(result.category).toBe('social');
      expect(result.confidence).toBe(0.1);
      expect(result.matchedKeywords).toEqual([]);
    });

    it('should be case-insensitive when matching keywords', async () => {
      const notification: ClassificationInput = {
        title: 'URGENT: Please respond ASAP',
        content: null,
        sender: null,
      };

      const result = await classifier.classify(notification);

      expect(result.category).toBe('important');
      expect(result.matchedKeywords).toContain('urgent');
      expect(result.matchedKeywords).toContain('asap');
    });

    it('should pick the category with the most keyword matches', async () => {
      const notification: ClassificationInput = {
        title: 'Big sale discount deal',
        content: 'Limited coupon available',
        sender: null,
      };

      const result = await classifier.classify(notification);

      expect(result.category).toBe('promotion');
      expect(result.matchedKeywords.length).toBeGreaterThanOrEqual(4);
    });

    it('should cap confidence at 1.0', async () => {
      // All keywords in a category match
      const notification: ClassificationInput = {
        title: 'alert warning danger fire accident 911',
        content: null,
        sender: null,
      };

      const result = await classifier.classify(notification);

      expect(result.category).toBe('emergency');
      expect(result.confidence).toBe(1.0);
    });

    it('should return a valid category even with empty dictionary', async () => {
      mockedGet.mockResolvedValue(null);

      const notification: ClassificationInput = {
        title: 'Some notification',
        content: 'With some content',
        sender: 'Someone',
      };

      const result = await classifier.classify(notification);

      expect(result.category).toBe('social');
      expect(result.confidence).toBe(0.1);
      expect(result.matchedKeywords).toEqual([]);
    });

    it('should handle malformed JSON in settings gracefully', async () => {
      mockedGet.mockResolvedValue('not valid json{{{');

      const notification: ClassificationInput = {
        title: 'Urgent message',
        content: null,
        sender: null,
      };

      const result = await classifier.classify(notification);

      // Falls back to empty dictionary, so defaults to social
      expect(result.category).toBe('social');
      expect(result.confidence).toBe(0.1);
    });

    it('should always return exactly one category from the valid set', async () => {
      const validCategories = [
        'important',
        'work',
        'social',
        'spam',
        'promotion',
        'emergency',
      ];

      const notification: ClassificationInput = {
        title: 'Test notification',
        content: 'meeting urgent sale alert',
        sender: null,
      };

      const result = await classifier.classify(notification);

      expect(validCategories).toContain(result.category);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('updateKeywords()', () => {
    it('should update keywords for a specific category', async () => {
      await classifier.updateKeywords('work', ['standup', 'sprint', 'jira']);

      expect(mockedSet).toHaveBeenCalledWith(
        'ai_keyword_dictionary',
        expect.any(String)
      );

      const savedValue = JSON.parse(mockedSet.mock.calls[0][1]);
      expect(savedValue.work).toEqual(['standup', 'sprint', 'jira']);
      // Other categories should remain unchanged
      expect(savedValue.important).toEqual(DEFAULT_DICTIONARY.important);
    });

    it('should preserve other categories when updating one', async () => {
      await classifier.updateKeywords('emergency', ['tsunami', 'earthquake']);

      const savedValue = JSON.parse(mockedSet.mock.calls[0][1]);
      expect(savedValue.emergency).toEqual(['tsunami', 'earthquake']);
      expect(savedValue.work).toEqual(DEFAULT_DICTIONARY.work);
      expect(savedValue.social).toEqual(DEFAULT_DICTIONARY.social);
    });
  });

  describe('getKeywordDictionary()', () => {
    it('should return the stored keyword dictionary', async () => {
      const result = await classifier.getKeywordDictionary();

      expect(result).toEqual(DEFAULT_DICTIONARY);
    });

    it('should return empty arrays for all categories when no dictionary is stored', async () => {
      mockedGet.mockResolvedValue(null);

      const result = await classifier.getKeywordDictionary();

      expect(result.important).toEqual([]);
      expect(result.work).toEqual([]);
      expect(result.social).toEqual([]);
      expect(result.spam).toEqual([]);
      expect(result.promotion).toEqual([]);
      expect(result.emergency).toEqual([]);
    });

    it('should fill missing categories with empty arrays', async () => {
      mockedGet.mockResolvedValue(
        JSON.stringify({ important: ['urgent'], work: ['meeting'] })
      );

      const result = await classifier.getKeywordDictionary();

      expect(result.important).toEqual(['urgent']);
      expect(result.work).toEqual(['meeting']);
      expect(result.social).toEqual([]);
      expect(result.spam).toEqual([]);
      expect(result.promotion).toEqual([]);
      expect(result.emergency).toEqual([]);
    });

    it('should handle corrupted JSON gracefully', async () => {
      mockedGet.mockResolvedValue('corrupted data');

      const result = await classifier.getKeywordDictionary();

      expect(result.important).toEqual([]);
      expect(result.work).toEqual([]);
      expect(result.social).toEqual([]);
      expect(result.spam).toEqual([]);
      expect(result.promotion).toEqual([]);
      expect(result.emergency).toEqual([]);
    });
  });
});
