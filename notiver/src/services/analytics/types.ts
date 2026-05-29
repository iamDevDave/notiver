/**
 * Analytics Service type definitions.
 * Defines the interface and data types for analytics aggregation.
 */

import type { NotificationCategory } from '@/src/database/schema';

/**
 * Time period for analytics queries.
 * Determines the date range and aggregation granularity.
 */
export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Aggregated analytics metrics for a given time period.
 */
export interface AnalyticsMetrics {
  notificationCount: number;
  ruleTriggeredCount: number;
  focusMinutes: number;
  distractionCount: number;
  productivityScore: number; // 0-100
  focusScore: number; // 0-100
  topApps: AppStats[];
  categoryBreakdown: Record<string, number>;
}

/**
 * A single data point in a trend series.
 */
export interface TrendData {
  label: string;
  date: string;
  value: number;
}

/**
 * App statistics showing notification count per app.
 */
export interface AppStats {
  packageName: string;
  appName: string;
  count: number;
}

/**
 * Events that trigger incremental analytics updates.
 */
export type AnalyticsEventType =
  | 'notification_received'
  | 'rule_executed'
  | 'focus_session_ended'
  | 'notification_blocked';

/**
 * Payload for an analytics event that triggers an incremental update.
 */
export interface AnalyticsEvent {
  type: AnalyticsEventType;
  timestamp: Date;
  data: {
    packageName?: string;
    appName?: string;
    category?: NotificationCategory;
    ruleId?: string;
    focusMinutes?: number;
    blockedCount?: number;
  };
}

/**
 * Analytics Service interface.
 * Provides methods for querying aggregated metrics and updating them incrementally.
 */
export interface IAnalyticsService {
  /** Get aggregated metrics for a time period */
  getMetrics(period: TimePeriod): Promise<AnalyticsMetrics>;

  /** Get notification count trend data for a time period */
  getNotificationTrend(period: TimePeriod): Promise<TrendData[]>;

  /** Get top apps ranked by notification count */
  getTopApps(period: TimePeriod, limit: number): Promise<AppStats[]>;

  /** Calculate productivity score for a time period (0-100) */
  getProductivityScore(period: TimePeriod): Promise<number>;

  /** Calculate focus score for a time period (0-100) */
  getFocusScore(period: TimePeriod): Promise<number>;

  /** Incrementally update analytics on new events */
  incrementalUpdate(event: AnalyticsEvent): Promise<void>;
}
