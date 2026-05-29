/**
 * Unit tests for AnalyticsService.
 * Tests metric aggregation, trend calculation, top apps ranking,
 * score formulas, and incremental updates.
 */

// Mock the repository dependencies
const mockFindByDate = jest.fn();
const mockFindByDateRange = jest.fn();
const mockUpsert = jest.fn();

jest.mock('../../database/repositories', () => ({
  analyticsRepository: {
    findByDate: (...args: unknown[]) => mockFindByDate(...args),
    findByDateRange: (...args: unknown[]) => mockFindByDateRange(...args),
    upsert: (...args: unknown[]) => mockUpsert(...args),
  },
  notificationRepository: {},
  focusSessionRepository: {},
  ruleExecutionRepository: {},
}));

import { AnalyticsService } from './analytics.service';
import type { AnalyticsEvent } from './types';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService();
    mockFindByDateRange.mockResolvedValue([]);
    mockFindByDate.mockResolvedValue([]);
    mockUpsert.mockResolvedValue({});
  });

  describe('getMetrics()', () => {
    it('returns zero metrics when no analytics records exist', async () => {
      mockFindByDateRange.mockResolvedValue([]);

      const metrics = await service.getMetrics('daily');

      expect(metrics.notificationCount).toBe(0);
      expect(metrics.ruleTriggeredCount).toBe(0);
      expect(metrics.focusMinutes).toBe(0);
      expect(metrics.distractionCount).toBe(0);
      expect(metrics.productivityScore).toBe(0);
      expect(metrics.focusScore).toBe(0);
      expect(metrics.topApps).toEqual([]);
      expect(metrics.categoryBreakdown).toEqual({});
    });

    it('sums notification counts from multiple records', async () => {
      mockFindByDateRange.mockResolvedValue([
        { notificationCount: 10, ruleTriggeredCount: 3, focusMinutes: 30, distractionCount: 2, topApps: null, categoryBreakdown: null },
        { notificationCount: 5, ruleTriggeredCount: 2, focusMinutes: 15, distractionCount: 1, topApps: null, categoryBreakdown: null },
      ]);

      const metrics = await service.getMetrics('daily');

      expect(metrics.notificationCount).toBe(15);
      expect(metrics.ruleTriggeredCount).toBe(5);
      expect(metrics.focusMinutes).toBe(45);
      expect(metrics.distractionCount).toBe(3);
    });

    it('aggregates topApps from JSON fields', async () => {
      mockFindByDateRange.mockResolvedValue([
        {
          notificationCount: 5,
          ruleTriggeredCount: 0,
          focusMinutes: 0,
          distractionCount: 0,
          topApps: JSON.stringify([
            { packageName: 'com.slack', appName: 'Slack', count: 3 },
            { packageName: 'com.gmail', appName: 'Gmail', count: 2 },
          ]),
          categoryBreakdown: null,
        },
        {
          notificationCount: 3,
          ruleTriggeredCount: 0,
          focusMinutes: 0,
          distractionCount: 0,
          topApps: JSON.stringify([
            { packageName: 'com.slack', appName: 'Slack', count: 1 },
            { packageName: 'com.twitter', appName: 'Twitter', count: 2 },
          ]),
          categoryBreakdown: null,
        },
      ]);

      const metrics = await service.getMetrics('daily');

      expect(metrics.topApps).toHaveLength(3);
      // Slack should be first with count 4
      expect(metrics.topApps[0]).toEqual({ packageName: 'com.slack', appName: 'Slack', count: 4 });
      // Twitter and Gmail with count 2 each
      const counts = metrics.topApps.map((a) => a.count);
      expect(counts).toEqual([4, 2, 2]);
    });

    it('aggregates categoryBreakdown from JSON fields', async () => {
      mockFindByDateRange.mockResolvedValue([
        {
          notificationCount: 5,
          ruleTriggeredCount: 0,
          focusMinutes: 0,
          distractionCount: 0,
          topApps: null,
          categoryBreakdown: JSON.stringify({ work: 3, social: 2 }),
        },
        {
          notificationCount: 3,
          ruleTriggeredCount: 0,
          focusMinutes: 0,
          distractionCount: 0,
          topApps: null,
          categoryBreakdown: JSON.stringify({ work: 1, spam: 2 }),
        },
      ]);

      const metrics = await service.getMetrics('daily');

      expect(metrics.categoryBreakdown).toEqual({ work: 4, social: 2, spam: 2 });
    });

    it('handles malformed topApps JSON gracefully', async () => {
      mockFindByDateRange.mockResolvedValue([
        {
          notificationCount: 5,
          ruleTriggeredCount: 0,
          focusMinutes: 0,
          distractionCount: 0,
          topApps: 'invalid json{{{',
          categoryBreakdown: null,
        },
      ]);

      const metrics = await service.getMetrics('daily');

      expect(metrics.topApps).toEqual([]);
    });

    it('calculates productivity score based on formula', async () => {
      // 10 notifications, 8 rules triggered, 1 distraction
      // automationEfficiency = min(1, 8/10) = 0.8 → 50% weight = 0.4
      // lowDistractionRatio = max(0, 1 - 1/10) = 0.9 → 30% weight = 0.27
      // baseActivity = min(1, 10/10) = 1.0 → 20% weight = 0.2
      // score = (0.4 + 0.27 + 0.2) * 100 = 87
      mockFindByDateRange.mockResolvedValue([
        {
          notificationCount: 10,
          ruleTriggeredCount: 8,
          focusMinutes: 0,
          distractionCount: 1,
          topApps: null,
          categoryBreakdown: null,
        },
      ]);

      const metrics = await service.getMetrics('daily');

      expect(metrics.productivityScore).toBe(87);
    });

    it('calculates focus score based on target minutes', async () => {
      // Daily target: 480 min. Actual: 240 min → 50%
      mockFindByDateRange.mockResolvedValue([
        {
          notificationCount: 5,
          ruleTriggeredCount: 0,
          focusMinutes: 240,
          distractionCount: 0,
          topApps: null,
          categoryBreakdown: null,
        },
      ]);

      const metrics = await service.getMetrics('daily');

      expect(metrics.focusScore).toBe(50);
    });

    it('caps focus score at 100', async () => {
      // Daily target: 480 min. Actual: 600 min → capped at 100
      mockFindByDateRange.mockResolvedValue([
        {
          notificationCount: 5,
          ruleTriggeredCount: 0,
          focusMinutes: 600,
          distractionCount: 0,
          topApps: null,
          categoryBreakdown: null,
        },
      ]);

      const metrics = await service.getMetrics('daily');

      expect(metrics.focusScore).toBe(100);
    });
  });

  describe('getNotificationTrend()', () => {
    it('returns empty values when no records exist', async () => {
      mockFindByDateRange.mockResolvedValue([]);

      const trend = await service.getNotificationTrend('weekly');

      expect(trend).toHaveLength(7);
      expect(trend.every((t) => t.value === 0)).toBe(true);
    });

    it('returns 24 hourly buckets for daily period', async () => {
      mockFindByDateRange.mockResolvedValue([]);

      const trend = await service.getNotificationTrend('daily');

      expect(trend).toHaveLength(24);
      expect(trend[0].label).toBe('00:00');
      expect(trend[23].label).toBe('23:00');
    });

    it('returns 7 daily buckets for weekly period', async () => {
      mockFindByDateRange.mockResolvedValue([]);

      const trend = await service.getNotificationTrend('weekly');

      expect(trend).toHaveLength(7);
    });

    it('returns 12 monthly buckets for yearly period', async () => {
      mockFindByDateRange.mockResolvedValue([]);

      const trend = await service.getNotificationTrend('yearly');

      expect(trend).toHaveLength(12);
      expect(trend[0].label).toBe('Jan');
      expect(trend[11].label).toBe('Dec');
    });

    it('aggregates notification counts by hour for daily period', async () => {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      mockFindByDateRange.mockResolvedValue([
        { date: dateStr, hour: 9, notificationCount: 5 },
        { date: dateStr, hour: 14, notificationCount: 8 },
      ]);

      const trend = await service.getNotificationTrend('daily');

      expect(trend[9].value).toBe(5);
      expect(trend[14].value).toBe(8);
      expect(trend[0].value).toBe(0);
    });
  });

  describe('getTopApps()', () => {
    it('returns empty array when no records exist', async () => {
      mockFindByDateRange.mockResolvedValue([]);

      const topApps = await service.getTopApps('daily', 5);

      expect(topApps).toEqual([]);
    });

    it('ranks apps by notification count descending', async () => {
      mockFindByDateRange.mockResolvedValue([
        {
          topApps: JSON.stringify([
            { packageName: 'com.slack', appName: 'Slack', count: 10 },
            { packageName: 'com.gmail', appName: 'Gmail', count: 20 },
            { packageName: 'com.twitter', appName: 'Twitter', count: 5 },
          ]),
        },
      ]);

      const topApps = await service.getTopApps('daily', 5);

      expect(topApps[0].packageName).toBe('com.gmail');
      expect(topApps[0].count).toBe(20);
      expect(topApps[1].packageName).toBe('com.slack');
      expect(topApps[2].packageName).toBe('com.twitter');
    });

    it('respects the limit parameter', async () => {
      mockFindByDateRange.mockResolvedValue([
        {
          topApps: JSON.stringify([
            { packageName: 'com.a', appName: 'A', count: 10 },
            { packageName: 'com.b', appName: 'B', count: 8 },
            { packageName: 'com.c', appName: 'C', count: 6 },
            { packageName: 'com.d', appName: 'D', count: 4 },
            { packageName: 'com.e', appName: 'E', count: 2 },
          ]),
        },
      ]);

      const topApps = await service.getTopApps('daily', 3);

      expect(topApps).toHaveLength(3);
      expect(topApps[0].packageName).toBe('com.a');
      expect(topApps[2].packageName).toBe('com.c');
    });

    it('aggregates counts across multiple records', async () => {
      mockFindByDateRange.mockResolvedValue([
        {
          topApps: JSON.stringify([
            { packageName: 'com.slack', appName: 'Slack', count: 5 },
          ]),
        },
        {
          topApps: JSON.stringify([
            { packageName: 'com.slack', appName: 'Slack', count: 3 },
          ]),
        },
      ]);

      const topApps = await service.getTopApps('daily', 5);

      expect(topApps[0].count).toBe(8);
    });
  });

  describe('getProductivityScore()', () => {
    it('returns 0 when no notifications exist', async () => {
      mockFindByDateRange.mockResolvedValue([]);

      const score = await service.getProductivityScore('daily');

      expect(score).toBe(0);
    });

    it('returns high score with good automation and low distractions', async () => {
      mockFindByDateRange.mockResolvedValue([
        {
          notificationCount: 20,
          ruleTriggeredCount: 20,
          focusMinutes: 0,
          distractionCount: 0,
          topApps: null,
          categoryBreakdown: null,
        },
      ]);

      const score = await service.getProductivityScore('daily');

      // automationEfficiency = 1.0 → 0.5
      // lowDistractionRatio = 1.0 → 0.3
      // baseActivity = 1.0 → 0.2
      // total = 100
      expect(score).toBe(100);
    });
  });

  describe('getFocusScore()', () => {
    it('returns 0 when no focus minutes recorded', async () => {
      mockFindByDateRange.mockResolvedValue([]);

      const score = await service.getFocusScore('daily');

      expect(score).toBe(0);
    });

    it('returns proportional score based on target', async () => {
      // Weekly target: 2400 min. Actual: 1200 min → 50%
      mockFindByDateRange.mockResolvedValue([
        {
          notificationCount: 0,
          ruleTriggeredCount: 0,
          focusMinutes: 1200,
          distractionCount: 0,
          topApps: null,
          categoryBreakdown: null,
        },
      ]);

      const score = await service.getFocusScore('weekly');

      expect(score).toBe(50);
    });
  });

  describe('incrementalUpdate()', () => {
    it('increments notification count for notification_received event', async () => {
      mockFindByDate.mockResolvedValue([]);

      const event: AnalyticsEvent = {
        type: 'notification_received',
        timestamp: new Date(2024, 0, 15, 10, 30),
        data: {
          packageName: 'com.slack',
          appName: 'Slack',
          category: 'work',
        },
      };

      await service.incrementalUpdate(event);

      expect(mockUpsert).toHaveBeenCalledWith(
        '2024-01-15',
        10,
        expect.objectContaining({
          notificationCount: 1,
        })
      );
    });

    it('increments existing notification count', async () => {
      mockFindByDate.mockResolvedValue([
        { hour: 10, notificationCount: 5, ruleTriggeredCount: 2, focusMinutes: 0, distractionCount: 0, topApps: null, categoryBreakdown: null },
      ]);

      const event: AnalyticsEvent = {
        type: 'notification_received',
        timestamp: new Date(2024, 0, 15, 10, 30),
        data: {
          packageName: 'com.slack',
          appName: 'Slack',
        },
      };

      await service.incrementalUpdate(event);

      expect(mockUpsert).toHaveBeenCalledWith(
        '2024-01-15',
        10,
        expect.objectContaining({
          notificationCount: 6,
        })
      );
    });

    it('updates topApps JSON on notification_received', async () => {
      mockFindByDate.mockResolvedValue([
        {
          hour: 10,
          notificationCount: 2,
          ruleTriggeredCount: 0,
          focusMinutes: 0,
          distractionCount: 0,
          topApps: JSON.stringify([{ packageName: 'com.slack', appName: 'Slack', count: 2 }]),
          categoryBreakdown: null,
        },
      ]);

      const event: AnalyticsEvent = {
        type: 'notification_received',
        timestamp: new Date(2024, 0, 15, 10, 30),
        data: {
          packageName: 'com.slack',
          appName: 'Slack',
        },
      };

      await service.incrementalUpdate(event);

      const upsertCall = mockUpsert.mock.calls[0];
      const topApps = JSON.parse(upsertCall[2].topApps);
      expect(topApps).toEqual([{ packageName: 'com.slack', appName: 'Slack', count: 3 }]);
    });

    it('adds new app to topApps on notification_received', async () => {
      mockFindByDate.mockResolvedValue([
        {
          hour: 10,
          notificationCount: 2,
          ruleTriggeredCount: 0,
          focusMinutes: 0,
          distractionCount: 0,
          topApps: JSON.stringify([{ packageName: 'com.slack', appName: 'Slack', count: 2 }]),
          categoryBreakdown: null,
        },
      ]);

      const event: AnalyticsEvent = {
        type: 'notification_received',
        timestamp: new Date(2024, 0, 15, 10, 30),
        data: {
          packageName: 'com.gmail',
          appName: 'Gmail',
        },
      };

      await service.incrementalUpdate(event);

      const upsertCall = mockUpsert.mock.calls[0];
      const topApps = JSON.parse(upsertCall[2].topApps);
      expect(topApps).toHaveLength(2);
      expect(topApps).toContainEqual({ packageName: 'com.gmail', appName: 'Gmail', count: 1 });
    });

    it('increments rule_triggered count for rule_executed event', async () => {
      mockFindByDate.mockResolvedValue([
        { hour: 14, notificationCount: 5, ruleTriggeredCount: 3, focusMinutes: 0, distractionCount: 0, topApps: null, categoryBreakdown: null },
      ]);

      const event: AnalyticsEvent = {
        type: 'rule_executed',
        timestamp: new Date(2024, 0, 15, 14, 0),
        data: { ruleId: 'rule-1' },
      };

      await service.incrementalUpdate(event);

      expect(mockUpsert).toHaveBeenCalledWith(
        '2024-01-15',
        14,
        expect.objectContaining({
          ruleTriggeredCount: 4,
          notificationCount: 5,
        })
      );
    });

    it('adds focus minutes for focus_session_ended event', async () => {
      mockFindByDate.mockResolvedValue([
        { hour: 16, notificationCount: 0, ruleTriggeredCount: 0, focusMinutes: 30, distractionCount: 0, topApps: null, categoryBreakdown: null },
      ]);

      const event: AnalyticsEvent = {
        type: 'focus_session_ended',
        timestamp: new Date(2024, 0, 15, 16, 0),
        data: { focusMinutes: 45 },
      };

      await service.incrementalUpdate(event);

      expect(mockUpsert).toHaveBeenCalledWith(
        '2024-01-15',
        16,
        expect.objectContaining({
          focusMinutes: 75,
          notificationCount: 0,
          ruleTriggeredCount: 0,
        })
      );
    });

    it('increments distraction count for notification_blocked event', async () => {
      mockFindByDate.mockResolvedValue([
        { hour: 11, notificationCount: 3, ruleTriggeredCount: 0, focusMinutes: 60, distractionCount: 2, topApps: null, categoryBreakdown: null },
      ]);

      const event: AnalyticsEvent = {
        type: 'notification_blocked',
        timestamp: new Date(2024, 0, 15, 11, 0),
        data: {},
      };

      await service.incrementalUpdate(event);

      expect(mockUpsert).toHaveBeenCalledWith(
        '2024-01-15',
        11,
        expect.objectContaining({
          distractionCount: 3,
          focusMinutes: 60,
        })
      );
    });

    it('creates new record when no existing record for the hour', async () => {
      mockFindByDate.mockResolvedValue([]);

      const event: AnalyticsEvent = {
        type: 'rule_executed',
        timestamp: new Date(2024, 0, 15, 9, 0),
        data: { ruleId: 'rule-1' },
      };

      await service.incrementalUpdate(event);

      expect(mockUpsert).toHaveBeenCalledWith(
        '2024-01-15',
        9,
        expect.objectContaining({
          ruleTriggeredCount: 1,
          notificationCount: 0,
          focusMinutes: 0,
          distractionCount: 0,
        })
      );
    });

    it('updates category breakdown on notification_received', async () => {
      mockFindByDate.mockResolvedValue([
        {
          hour: 10,
          notificationCount: 3,
          ruleTriggeredCount: 0,
          focusMinutes: 0,
          distractionCount: 0,
          topApps: null,
          categoryBreakdown: JSON.stringify({ work: 2, social: 1 }),
        },
      ]);

      const event: AnalyticsEvent = {
        type: 'notification_received',
        timestamp: new Date(2024, 0, 15, 10, 30),
        data: {
          packageName: 'com.slack',
          appName: 'Slack',
          category: 'work',
        },
      };

      await service.incrementalUpdate(event);

      const upsertCall = mockUpsert.mock.calls[0];
      const categories = JSON.parse(upsertCall[2].categoryBreakdown);
      expect(categories).toEqual({ work: 3, social: 1 });
    });
  });
});
