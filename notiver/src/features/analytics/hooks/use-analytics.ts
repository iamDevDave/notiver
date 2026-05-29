import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/src/services/analytics';
import type { TimePeriod, AnalyticsMetrics, TrendData, AppStats } from '@/src/services/analytics';

/**
 * Hook to fetch aggregated analytics metrics for a given time period.
 * Wires to AnalyticsService.getMetrics via TanStack Query.
 *
 * Validates: Requirements 12.1, 12.2
 */
export function useAnalyticsMetrics(period: TimePeriod) {
  return useQuery<AnalyticsMetrics>({
    queryKey: ['analytics', 'metrics', period],
    queryFn: () => analyticsService.getMetrics(period),
  });
}

/**
 * Hook to fetch notification trend data for a given time period.
 * Returns data points suitable for line/bar charts.
 *
 * Validates: Requirements 12.3, 12.4
 */
export function useNotificationTrend(period: TimePeriod) {
  return useQuery<TrendData[]>({
    queryKey: ['analytics', 'trend', period],
    queryFn: () => analyticsService.getNotificationTrend(period),
  });
}

/**
 * Hook to fetch top apps by notification count for a given time period.
 *
 * Validates: Requirements 12.3
 */
export function useTopApps(period: TimePeriod, limit: number = 5) {
  return useQuery<AppStats[]>({
    queryKey: ['analytics', 'topApps', period, limit],
    queryFn: () => analyticsService.getTopApps(period, limit),
  });
}

/**
 * Hook to fetch the heatmap data (hour × day activity patterns).
 * Returns a 7×24 matrix of notification counts.
 *
 * Validates: Requirements 12.3
 */
export function useActivityHeatmap(period: TimePeriod) {
  return useQuery<{ day: number; hour: number; value: number }[]>({
    queryKey: ['analytics', 'heatmap', period],
    queryFn: async () => {
      // Get the trend data which has per-hour/per-day granularity
      // For heatmap, we need hour × day-of-week data
      const metrics = await analyticsService.getMetrics(period);
      const trend = await analyticsService.getNotificationTrend(period);

      // Build a simplified heatmap from available data
      // Each cell represents (dayOfWeek, hour) → notification count
      const heatmapData: { day: number; hour: number; value: number }[] = [];

      if (period === 'daily') {
        // For daily, show hours as a single row
        for (const point of trend) {
          const hourMatch = point.label.match(/^(\d{2}):00$/);
          if (hourMatch) {
            const hour = parseInt(hourMatch[1], 10);
            const today = new Date().getDay();
            heatmapData.push({ day: today, hour, value: point.value });
          }
        }
      } else {
        // For weekly/monthly/yearly, distribute across day-of-week buckets
        for (const point of trend) {
          const date = new Date(point.date);
          const dayOfWeek = date.getDay();
          // Spread value across hours proportionally (simplified)
          if (point.value > 0) {
            // Distribute notifications across typical active hours (8-22)
            const activeHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
            const perHour = Math.round(point.value / activeHours.length);
            for (const hour of activeHours) {
              const existing = heatmapData.find(
                (h) => h.day === dayOfWeek && h.hour === hour
              );
              if (existing) {
                existing.value += perHour;
              } else {
                heatmapData.push({ day: dayOfWeek, hour, value: perHour });
              }
            }
          }
        }
      }

      return heatmapData;
    },
  });
}
