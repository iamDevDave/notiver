/**
 * Analytics Service module.
 * Provides analytics aggregation, metric calculation, and incremental updates.
 */

export { AnalyticsService } from './analytics.service';
export {
  initAnalyticsEventIntegration,
  disposeAnalyticsEventIntegration,
} from './analytics-event-integration';
export type {
  IAnalyticsService,
  TimePeriod,
  AnalyticsMetrics,
  TrendData,
  AppStats,
  AnalyticsEvent,
  AnalyticsEventType,
} from './types';

// Singleton instance for use across the application
import { AnalyticsService } from './analytics.service';
export const analyticsService = new AnalyticsService();
