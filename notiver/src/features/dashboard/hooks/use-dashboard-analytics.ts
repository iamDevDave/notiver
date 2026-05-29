import { useQuery } from '@tanstack/react-query';
import {
  analyticsRepository,
  notificationRepository,
  ruleExecutionRepository,
  focusSessionRepository,
} from '@/src/database/repositories';

/**
 * Returns the start and end of today as Date objects.
 */
function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

/**
 * Returns today's date as YYYY-MM-DD string.
 */
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface DashboardAnalytics {
  notificationsToday: number;
  rulesTriggered: number;
  focusMinutes: number;
  productivityScore: number;
  focusScore: number;
}

/**
 * Hook to fetch dashboard analytics metrics for today.
 * Uses TanStack Query to cache and manage the async state from local SQLite.
 */
export function useDashboardAnalytics() {
  return useQuery<DashboardAnalytics>({
    queryKey: ['dashboard', 'analytics', getTodayDateString()],
    queryFn: async (): Promise<DashboardAnalytics> => {
      const { start, end } = getTodayRange();
      const todayDate = getTodayDateString();

      // Fetch today's notifications count
      const todayNotifications = await notificationRepository.findByDateRange(start, end);
      const notificationsToday = todayNotifications.length;

      // Fetch today's analytics record for aggregated metrics
      const analyticsRecords = await analyticsRepository.findByDate(todayDate);

      // Sum up rule triggered count and focus minutes from analytics records
      let rulesTriggered = 0;
      let focusMinutes = 0;
      let distractionCount = 0;

      for (const record of analyticsRecords) {
        rulesTriggered += record.ruleTriggeredCount ?? 0;
        focusMinutes += record.focusMinutes ?? 0;
        distractionCount += record.distractionCount ?? 0;
      }

      // Calculate productivity score (0-100)
      // Based on ratio of rules triggered vs notifications (automation efficiency)
      const productivityScore = notificationsToday > 0
        ? Math.min(100, Math.round((rulesTriggered / notificationsToday) * 100))
        : 0;

      // Calculate focus score (0-100)
      // Based on focus minutes vs total waking hours (16h = 960min)
      const targetFocusMinutes = 480; // 8 hours target
      const focusScore = Math.min(100, Math.round((focusMinutes / targetFocusMinutes) * 100));

      return {
        notificationsToday,
        rulesTriggered,
        focusMinutes,
        productivityScore,
        focusScore,
      };
    },
  });
}
