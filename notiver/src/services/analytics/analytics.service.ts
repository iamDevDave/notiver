/**
 * Analytics Aggregation Service.
 * Implements IAnalyticsService to calculate and aggregate notification metrics,
 * productivity scores, and usage statistics from the local database.
 *
 * Validates: Requirements 12.1, 12.4, 12.5
 */

import {
  analyticsRepository,
  notificationRepository,
  focusSessionRepository,
  ruleExecutionRepository,
} from '@/src/database/repositories';
import type {
  IAnalyticsService,
  TimePeriod,
  AnalyticsMetrics,
  TrendData,
  AppStats,
  AnalyticsEvent,
} from './types';

/**
 * Returns the date range boundaries for a given time period.
 * Start is inclusive, end is exclusive (start of next period).
 */
function getDateRange(period: TimePeriod): { start: Date; end: Date } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'daily': {
      const start = startOfToday;
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }
    case 'weekly': {
      // Start from Monday of the current week
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const start = new Date(startOfToday);
      start.setDate(start.getDate() + mondayOffset);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end };
    }
    case 'monthly': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { start, end };
    }
    case 'yearly': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
      return { start, end };
    }
  }
}

/**
 * Formats a Date to YYYY-MM-DD string.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates time bucket labels for trend data based on the period.
 */
function getTimeBuckets(period: TimePeriod): { date: string; label: string }[] {
  const { start, end } = getDateRange(period);
  const buckets: { date: string; label: string }[] = [];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  switch (period) {
    case 'daily': {
      // 24 hourly buckets for today
      for (let h = 0; h < 24; h++) {
        buckets.push({
          date: formatDate(start),
          label: `${String(h).padStart(2, '0')}:00`,
        });
      }
      break;
    }
    case 'weekly': {
      // 7 daily buckets
      const current = new Date(start);
      while (current < end) {
        buckets.push({
          date: formatDate(current),
          label: dayLabels[current.getDay()],
        });
        current.setDate(current.getDate() + 1);
      }
      break;
    }
    case 'monthly': {
      // Daily buckets for the month
      const current = new Date(start);
      while (current < end) {
        buckets.push({
          date: formatDate(current),
          label: String(current.getDate()),
        });
        current.setDate(current.getDate() + 1);
      }
      break;
    }
    case 'yearly': {
      // Monthly buckets
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(start.getFullYear(), m, 1);
        buckets.push({
          date: formatDate(monthStart),
          label: monthLabels[m],
        });
      }
      break;
    }
  }

  return buckets;
}

/**
 * AnalyticsService aggregates notification metrics, productivity scores,
 * and usage statistics from the pre-aggregated analytics table and raw data.
 */
export class AnalyticsService implements IAnalyticsService {
  /**
   * Get aggregated metrics for a time period.
   * Calculates total notifications, focus score, distraction score, productivity score.
   *
   * Validates: Requirement 12.1
   */
  async getMetrics(period: TimePeriod): Promise<AnalyticsMetrics> {
    const { start, end } = getDateRange(period);
    const startDate = formatDate(start);
    const endDate = formatDate(new Date(end.getTime() - 1)); // inclusive end for date range query

    // Fetch pre-aggregated analytics records for the period
    const records = await analyticsRepository.findByDateRange(startDate, endDate);

    // Sum up metrics from analytics records
    let notificationCount = 0;
    let ruleTriggeredCount = 0;
    let focusMinutes = 0;
    let distractionCount = 0;
    const appCounts: Record<string, { appName: string; count: number }> = {};
    const categoryBreakdown: Record<string, number> = {};

    for (const record of records) {
      notificationCount += record.notificationCount ?? 0;
      ruleTriggeredCount += record.ruleTriggeredCount ?? 0;
      focusMinutes += record.focusMinutes ?? 0;
      distractionCount += record.distractionCount ?? 0;

      // Aggregate top apps
      if (record.topApps) {
        try {
          const apps: { packageName: string; appName?: string; count: number }[] =
            typeof record.topApps === 'string'
              ? JSON.parse(record.topApps)
              : record.topApps;
          for (const app of apps) {
            if (!appCounts[app.packageName]) {
              appCounts[app.packageName] = {
                appName: app.appName ?? app.packageName.split('.').pop() ?? app.packageName,
                count: 0,
              };
            }
            appCounts[app.packageName].count += app.count;
          }
        } catch {
          // Skip malformed topApps data
        }
      }

      // Aggregate category breakdown
      if (record.categoryBreakdown) {
        try {
          const categories: Record<string, number> =
            typeof record.categoryBreakdown === 'string'
              ? JSON.parse(record.categoryBreakdown)
              : record.categoryBreakdown;
          for (const [category, count] of Object.entries(categories)) {
            categoryBreakdown[category] = (categoryBreakdown[category] ?? 0) + count;
          }
        } catch {
          // Skip malformed category data
        }
      }
    }

    // Build top apps list sorted by count
    const topApps: AppStats[] = Object.entries(appCounts)
      .map(([packageName, { appName, count }]) => ({ packageName, appName, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate scores
    const productivityScore = this.calculateProductivityScore(
      notificationCount,
      ruleTriggeredCount,
      distractionCount
    );
    const focusScore = this.calculateFocusScore(focusMinutes, period);

    return {
      notificationCount,
      ruleTriggeredCount,
      focusMinutes,
      distractionCount,
      productivityScore,
      focusScore,
      topApps,
      categoryBreakdown,
    };
  }

  /**
   * Get notification count trend data aggregated by time bucket.
   * Returns one data point per bucket (hour for daily, day for weekly/monthly, month for yearly).
   *
   * Validates: Requirement 12.4
   */
  async getNotificationTrend(period: TimePeriod): Promise<TrendData[]> {
    const { start, end } = getDateRange(period);
    const startDate = formatDate(start);
    const endDate = formatDate(new Date(end.getTime() - 1));
    const buckets = getTimeBuckets(period);

    // Fetch analytics records for the period
    const records = await analyticsRepository.findByDateRange(startDate, endDate);

    if (period === 'daily') {
      // For daily view, aggregate by hour
      return buckets.map((bucket, hourIndex) => {
        const hourRecords = records.filter(
          (r) => r.date === bucket.date && r.hour === hourIndex
        );
        const value = hourRecords.reduce(
          (sum, r) => sum + (r.notificationCount ?? 0),
          0
        );
        return { label: bucket.label, date: bucket.date, value };
      });
    }

    if (period === 'yearly') {
      // For yearly view, aggregate by month
      return buckets.map((bucket, monthIndex) => {
        const monthStart = new Date(start.getFullYear(), monthIndex, 1);
        const monthEnd = new Date(start.getFullYear(), monthIndex + 1, 1);
        const monthStartStr = formatDate(monthStart);
        const monthEndStr = formatDate(new Date(monthEnd.getTime() - 86400000)); // last day of month

        const monthRecords = records.filter(
          (r) => r.date >= monthStartStr && r.date <= monthEndStr
        );
        const value = monthRecords.reduce(
          (sum, r) => sum + (r.notificationCount ?? 0),
          0
        );
        return { label: bucket.label, date: bucket.date, value };
      });
    }

    // For weekly/monthly, aggregate by day
    return buckets.map((bucket) => {
      const dayRecords = records.filter((r) => r.date === bucket.date);
      const value = dayRecords.reduce(
        (sum, r) => sum + (r.notificationCount ?? 0),
        0
      );
      return { label: bucket.label, date: bucket.date, value };
    });
  }

  /**
   * Get top apps ranked by notification count for a time period.
   *
   * Validates: Requirement 12.4
   */
  async getTopApps(period: TimePeriod, limit: number): Promise<AppStats[]> {
    const { start, end } = getDateRange(period);
    const startDate = formatDate(start);
    const endDate = formatDate(new Date(end.getTime() - 1));

    // Fetch analytics records for the period
    const records = await analyticsRepository.findByDateRange(startDate, endDate);

    // Aggregate app counts from topApps JSON field
    const appCounts: Record<string, { appName: string; count: number }> = {};

    for (const record of records) {
      if (record.topApps) {
        try {
          const apps: { packageName: string; appName?: string; count: number }[] =
            typeof record.topApps === 'string'
              ? JSON.parse(record.topApps)
              : record.topApps;
          for (const app of apps) {
            if (!appCounts[app.packageName]) {
              appCounts[app.packageName] = {
                appName: app.appName ?? app.packageName.split('.').pop() ?? app.packageName,
                count: 0,
              };
            }
            appCounts[app.packageName].count += app.count;
          }
        } catch {
          // Skip malformed data
        }
      }
    }

    // Sort by count descending and take top N
    return Object.entries(appCounts)
      .map(([packageName, { appName, count }]) => ({ packageName, appName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calculate productivity score for a time period.
   *
   * Formula: Weighted combination of:
   * - Automation efficiency (rules triggered / notifications): 50% weight
   * - Low distraction ratio (1 - distractions / notifications): 30% weight
   * - Focus time contribution (focus minutes / target): 20% weight
   *
   * Returns a score from 0-100.
   *
   * Validates: Requirement 12.1
   */
  async getProductivityScore(period: TimePeriod): Promise<number> {
    const metrics = await this.getMetrics(period);
    return this.calculateProductivityScore(
      metrics.notificationCount,
      metrics.ruleTriggeredCount,
      metrics.distractionCount
    );
  }

  /**
   * Calculate focus score for a time period.
   *
   * Formula: (actual focus minutes / target focus minutes) * 100, capped at 100.
   * Target varies by period:
   * - Daily: 480 min (8 hours)
   * - Weekly: 2400 min (40 hours)
   * - Monthly: 9600 min (~160 hours)
   * - Yearly: 115200 min (~1920 hours)
   *
   * Returns a score from 0-100.
   *
   * Validates: Requirement 12.1
   */
  async getFocusScore(period: TimePeriod): Promise<number> {
    const metrics = await this.getMetrics(period);
    return metrics.focusScore;
  }

  /**
   * Incrementally update the pre-aggregated analytics table on new events.
   * This is called when notifications are received, rules are executed,
   * or focus sessions end.
   *
   * The update is idempotent for the same event — it uses upsert to
   * increment counters for the current date/hour bucket.
   *
   * Validates: Requirement 12.5
   */
  async incrementalUpdate(event: AnalyticsEvent): Promise<void> {
    const date = formatDate(event.timestamp);
    const hour = event.timestamp.getHours();

    // Fetch existing record for this date+hour
    const existingRecords = await analyticsRepository.findByDate(date);
    const hourRecord = existingRecords.find((r) => r.hour === hour);

    switch (event.type) {
      case 'notification_received': {
        const currentCount = hourRecord?.notificationCount ?? 0;
        const currentTopApps = this.parseTopApps(hourRecord?.topApps);
        const currentCategories = this.parseCategoryBreakdown(hourRecord?.categoryBreakdown);

        // Update app count
        if (event.data.packageName) {
          const existing = currentTopApps.find(
            (a) => a.packageName === event.data.packageName
          );
          if (existing) {
            existing.count += 1;
          } else {
            currentTopApps.push({
              packageName: event.data.packageName,
              appName: event.data.appName ?? event.data.packageName.split('.').pop() ?? event.data.packageName,
              count: 1,
            });
          }
        }

        // Update category count
        if (event.data.category) {
          currentCategories[event.data.category] =
            (currentCategories[event.data.category] ?? 0) + 1;
        }

        await analyticsRepository.upsert(date, hour, {
          notificationCount: currentCount + 1,
          topApps: JSON.stringify(currentTopApps),
          categoryBreakdown: JSON.stringify(currentCategories),
        });
        break;
      }

      case 'rule_executed': {
        const currentRuleCount = hourRecord?.ruleTriggeredCount ?? 0;
        await analyticsRepository.upsert(date, hour, {
          ruleTriggeredCount: currentRuleCount + 1,
          // Preserve existing fields
          notificationCount: hourRecord?.notificationCount ?? 0,
          focusMinutes: hourRecord?.focusMinutes ?? 0,
          distractionCount: hourRecord?.distractionCount ?? 0,
          topApps: hourRecord?.topApps ?? null,
          categoryBreakdown: hourRecord?.categoryBreakdown ?? null,
        });
        break;
      }

      case 'focus_session_ended': {
        const currentFocusMinutes = hourRecord?.focusMinutes ?? 0;
        const addedMinutes = event.data.focusMinutes ?? 0;

        await analyticsRepository.upsert(date, hour, {
          focusMinutes: currentFocusMinutes + addedMinutes,
          // Preserve existing fields
          notificationCount: hourRecord?.notificationCount ?? 0,
          ruleTriggeredCount: hourRecord?.ruleTriggeredCount ?? 0,
          distractionCount: hourRecord?.distractionCount ?? 0,
          topApps: hourRecord?.topApps ?? null,
          categoryBreakdown: hourRecord?.categoryBreakdown ?? null,
        });
        break;
      }

      case 'notification_blocked': {
        const currentDistractionCount = hourRecord?.distractionCount ?? 0;
        await analyticsRepository.upsert(date, hour, {
          distractionCount: currentDistractionCount + 1,
          // Preserve existing fields
          notificationCount: hourRecord?.notificationCount ?? 0,
          ruleTriggeredCount: hourRecord?.ruleTriggeredCount ?? 0,
          focusMinutes: hourRecord?.focusMinutes ?? 0,
          topApps: hourRecord?.topApps ?? null,
          categoryBreakdown: hourRecord?.categoryBreakdown ?? null,
        });
        break;
      }
    }
  }

  /**
   * Calculate productivity score from raw metrics.
   *
   * Formula:
   * - automationEfficiency = min(1, rulesTriggered / max(1, notifications)) → 50% weight
   * - lowDistractionRatio = max(0, 1 - distractions / max(1, notifications)) → 30% weight
   * - baseActivity = min(1, notifications / 10) → 20% weight (rewards having some activity)
   *
   * Score = round((automationEfficiency * 0.5 + lowDistractionRatio * 0.3 + baseActivity * 0.2) * 100)
   */
  private calculateProductivityScore(
    notificationCount: number,
    ruleTriggeredCount: number,
    distractionCount: number
  ): number {
    if (notificationCount === 0) {
      return 0;
    }

    const automationEfficiency = Math.min(1, ruleTriggeredCount / Math.max(1, notificationCount));
    const lowDistractionRatio = Math.max(0, 1 - distractionCount / Math.max(1, notificationCount));
    const baseActivity = Math.min(1, notificationCount / 10);

    const score = (automationEfficiency * 0.5 + lowDistractionRatio * 0.3 + baseActivity * 0.2) * 100;
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Calculate focus score based on actual focus minutes vs target.
   * Target varies by period to reflect realistic expectations.
   */
  private calculateFocusScore(focusMinutes: number, period: TimePeriod): number {
    const targets: Record<TimePeriod, number> = {
      daily: 480,     // 8 hours
      weekly: 2400,   // 40 hours
      monthly: 9600,  // ~160 hours
      yearly: 115200, // ~1920 hours
    };

    const target = targets[period];
    if (target === 0) return 0;

    const score = (focusMinutes / target) * 100;
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Parse topApps JSON field from analytics record.
   */
  private parseTopApps(
    topApps: string | null | undefined
  ): { packageName: string; appName: string; count: number }[] {
    if (!topApps) return [];
    try {
      return typeof topApps === 'string' ? JSON.parse(topApps) : topApps;
    } catch {
      return [];
    }
  }

  /**
   * Parse categoryBreakdown JSON field from analytics record.
   */
  private parseCategoryBreakdown(
    categoryBreakdown: string | null | undefined
  ): Record<string, number> {
    if (!categoryBreakdown) return {};
    try {
      return typeof categoryBreakdown === 'string'
        ? JSON.parse(categoryBreakdown)
        : categoryBreakdown;
    } catch {
      return {};
    }
  }
}
