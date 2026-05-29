import { useQuery } from '@tanstack/react-query';
import {
  notificationRepository,
  ruleExecutionRepository,
  focusSessionRepository,
} from '@/src/database/repositories';
import type { ActivityItem, ActivityType } from '../components/RecentActivityFeed';

/**
 * Hook to fetch recent activity items for the dashboard feed.
 * Combines Rule Activity, Notification Activity, and Focus Sessions,
 * ordered by recency.
 *
 * Validates: Requirement 6.4
 */
export function useRecentActivity(limit = 10) {
  return useQuery<ActivityItem[]>({
    queryKey: ['dashboard', 'recent-activity', limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      // Fetch recent notifications
      const recentNotifications = await notificationRepository.findByDateRange(
        threeDaysAgo,
        now
      );

      // Fetch recent rule executions (use findAll with limit)
      // The rule execution repository returns ordered by executedAt desc
      let recentExecutions: any[] = [];
      try {
        // Try to get recent executions - findAll may not support date filtering directly
        // so we get the most recent ones
        recentExecutions = await ruleExecutionRepository.findAll({ limit: 20 });
      } catch {
        recentExecutions = [];
      }

      // Fetch recent focus sessions
      const recentSessions = await focusSessionRepository.findByDateRange(
        threeDaysAgo,
        now
      );

      // Map to ActivityItem format
      const activities: ActivityItem[] = [];

      // Notification activities (take most recent 10)
      for (const notif of recentNotifications.slice(0, 10)) {
        activities.push({
          id: `notif-${notif.id}`,
          type: 'notification' as ActivityType,
          title: notif.title ?? notif.appName,
          subtitle: `From ${notif.appName}${notif.category ? ` • ${notif.category}` : ''}`,
          timestamp: new Date(notif.receivedAt),
        });
      }

      // Rule execution activities
      for (const exec of recentExecutions.slice(0, 10)) {
        const executedAt = exec.executedAt instanceof Date
          ? exec.executedAt
          : new Date(exec.executedAt);

        activities.push({
          id: `rule-${exec.id}`,
          type: 'rule' as ActivityType,
          title: `Rule ${exec.status === 'success' ? 'executed' : exec.status}`,
          subtitle: `${exec.status === 'success' ? '✓' : '⚠'} ${exec.actionsExecuted ? JSON.parse(exec.actionsExecuted).length : 0} action(s)`,
          timestamp: executedAt,
        });
      }

      // Focus session activities
      for (const session of recentSessions.slice(0, 10)) {
        const startedAt = session.startedAt instanceof Date
          ? session.startedAt
          : new Date(session.startedAt);

        const durationText = session.actualDurationMin
          ? `${session.actualDurationMin}min`
          : `${session.plannedDurationMin}min planned`;

        activities.push({
          id: `focus-${session.id}`,
          type: 'focus' as ActivityType,
          title: `${session.preset.charAt(0).toUpperCase() + session.preset.slice(1)} session`,
          subtitle: `${session.status} • ${durationText}`,
          timestamp: startedAt,
        });
      }

      // Sort by timestamp descending and take the limit
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return activities.slice(0, limit);
    },
  });
}
