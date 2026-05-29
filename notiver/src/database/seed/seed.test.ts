import { runSeed } from './index';

// Mock the repositories and db
const mockSettingsGet = jest.fn();
const mockSettingsSet = jest.fn();

jest.mock('../repositories', () => ({
  settingsRepository: {
    get: (...args: unknown[]) => mockSettingsGet(...args),
    set: (...args: unknown[]) => mockSettingsSet(...args),
  },
}));

const mockDbInsert = jest.fn();
const mockValues = jest.fn();

jest.mock('../index', () => ({
  db: {
    insert: (...args: unknown[]) => {
      mockDbInsert(...args);
      return { values: mockValues };
    },
  },
}));

jest.mock('../schema', () => ({
  rules: { id: 'rules' },
  ruleConditions: { id: 'rule_conditions' },
  ruleActions: { id: 'rule_actions' },
}));

describe('Database Seed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingsGet.mockResolvedValue(null);
    mockSettingsSet.mockResolvedValue(undefined);
    mockValues.mockResolvedValue(undefined);
  });

  describe('runSeed', () => {
    it('should run seed functions when seed has not been applied', async () => {
      mockSettingsGet.mockResolvedValue(null);

      await runSeed();

      // Should check if seed was already applied
      expect(mockSettingsGet).toHaveBeenCalledWith('seed_applied');

      // Should set default settings
      expect(mockSettingsSet).toHaveBeenCalledWith('theme', 'dark');
      expect(mockSettingsSet).toHaveBeenCalledWith('notification_sound', 'true');
      expect(mockSettingsSet).toHaveBeenCalledWith('notification_vibration', 'true');
      expect(mockSettingsSet).toHaveBeenCalledWith('rule_engine_enabled', 'true');
      expect(mockSettingsSet).toHaveBeenCalledWith('max_rules', '20');
      expect(mockSettingsSet).toHaveBeenCalledWith('data_retention_days', '30');
      expect(mockSettingsSet).toHaveBeenCalledWith('analytics_enabled', 'true');

      // Should seed AI keyword dictionary
      expect(mockSettingsSet).toHaveBeenCalledWith(
        'ai_keyword_dictionary',
        expect.stringContaining('"important"')
      );

      // Should mark seed as applied
      expect(mockSettingsSet).toHaveBeenCalledWith('seed_applied', 'true');
    });

    it('should skip seeding when seed has already been applied', async () => {
      mockSettingsGet.mockResolvedValue('true');

      await runSeed();

      // Should only call get to check the flag
      expect(mockSettingsGet).toHaveBeenCalledWith('seed_applied');

      // Should NOT set any settings (except the initial check)
      expect(mockSettingsSet).not.toHaveBeenCalled();

      // Should NOT insert any rules
      expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it('should seed rule templates with correct structure', async () => {
      mockSettingsGet.mockResolvedValue(null);

      await runSeed();

      // Should insert 4 rule templates
      const ruleInserts = mockDbInsert.mock.calls.filter(
        (call) => call[0]?.id === 'rules'
      );
      expect(ruleInserts).toHaveLength(4);

      // Verify rule template values were passed
      const ruleValues = mockValues.mock.calls;
      const silenceSpam = ruleValues.find(
        (call) => call[0]?.id === 'template-silence-spam'
      );
      expect(silenceSpam).toBeDefined();
      expect(silenceSpam![0].name).toBe('Silence Spam');
      expect(silenceSpam![0].triggerType).toBe('keyword');
      expect(silenceSpam![0].isActive).toBe(false);
    });

    it('should seed rule conditions for templates that have them', async () => {
      mockSettingsGet.mockResolvedValue(null);

      await runSeed();

      // Should insert conditions for Silence Spam and Focus Work
      const conditionInserts = mockDbInsert.mock.calls.filter(
        (call) => call[0]?.id === 'rule_conditions'
      );
      expect(conditionInserts).toHaveLength(2);
    });

    it('should seed rule actions for all templates', async () => {
      mockSettingsGet.mockResolvedValue(null);

      await runSeed();

      // Should insert actions for all 4 templates
      const actionInserts = mockDbInsert.mock.calls.filter(
        (call) => call[0]?.id === 'rule_actions'
      );
      expect(actionInserts).toHaveLength(4);
    });

    it('should seed AI keyword dictionary with all categories', async () => {
      mockSettingsGet.mockResolvedValue(null);

      await runSeed();

      const dictionaryCall = mockSettingsSet.mock.calls.find(
        (call) => call[0] === 'ai_keyword_dictionary'
      );
      expect(dictionaryCall).toBeDefined();

      const dictionary = JSON.parse(dictionaryCall![1]);
      expect(dictionary).toHaveProperty('important');
      expect(dictionary).toHaveProperty('work');
      expect(dictionary).toHaveProperty('social');
      expect(dictionary).toHaveProperty('spam');
      expect(dictionary).toHaveProperty('promotion');
      expect(dictionary).toHaveProperty('emergency');

      // Verify some keywords
      expect(dictionary.important).toContain('urgent');
      expect(dictionary.spam).toContain('prize');
      expect(dictionary.emergency).toContain('911');
    });
  });
});
