import { useQuery } from '@tanstack/react-query';
import {
  analyticsRepository,
} from '@/src/database/repositories';
import type { LineChartDataPoint } from '../components/charts';
import type { BarChartDataPoint } from '../components/charts';

/** Shape of an analytics record from the repository */
interface AnalyticsRecord {
  id: string;
  date: string;
  hour: number | null;
  notificationCount: number | null;
  ruleTriggeredCount: number | null;
  focusMinutes: number | null;
  distractionCount: number | null;
  topApps: string | null;
  categoryBreakdown: string | null;
}

/**
 * Returns the past N days as an array of { date: 'YYYY-MM-DD', label: 'Mon' } objects.
 */
function getPastDays(count: number): { date: string; label: string }[] {
  const days: { date: string; label: string }[] = [];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    days.push({
      date: `${year}-${month}-${day}`,
      label: dayLabels[d.getDay()],
    });
  }

  return days;
}

export interface DashboardChartData {
  notificationTrend: LineChartDataPoint[];
  topApps: BarChartDataPoint[];
  focusTrend: LineChartDataPoint[];
}

/**
 * Hook to fetch dashboard chart data for the past 7 days.
 * Provides notification trend, top apps, and focus trend data.
 *
 * Validates: Requirement 6.3
 */
export function useDashboardCharts() {
  return useQuery<DashboardChartData>({
    queryKey: ['dashboard', 'charts'],
    queryFn: async (): Promise<DashboardChartData> => {
      const pastDays = getPastDays(7);
      const startDate = pastDays[0].date;
      const endDate = pastDays[pastDays.length - 1].date;

      // Fetch analytics records for the past 7 days
      const analyticsRecords = await analyticsRepository.findByDateRange(startDate, endDate) as AnalyticsRecord[];

      // Build notification trend data
      const notificationTrend: LineChartDataPoint[] = pastDays.map(({ date, label }) => {
        const dayRecords = analyticsRecords.filter((r) => r.date === date);
        const count = dayRecords.reduce(
          (sum, r) => sum + (r.notificationCount ?? 0),
          0
        );
        return { label, value: count };
      });

      // Build focus trend data (minutes per day)
      const focusTrend: LineChartDataPoint[] = pastDays.map(({ date, label }) => {
        const dayRecords = analyticsRecords.filter((r) => r.date === date);
        const minutes = dayRecords.reduce(
          (sum, r) => sum + (r.focusMinutes ?? 0),
          0
        );
        return { label, value: minutes };
      });

      // Build top apps data from analytics topApps JSON field
      const appCounts: Record<string, number> = {};
      for (const record of analyticsRecords) {
        if (record.topApps) {
          try {
            const apps: { packageName: string; count: number }[] =
              typeof record.topApps === 'string'
                ? JSON.parse(record.topApps)
                : record.topApps;
            for (const app of apps) {
              const name = app.packageName.split('.').pop() ?? app.packageName;
              appCounts[name] = (appCounts[name] ?? 0) + app.count;
            }
          } catch {
            // Skip malformed topApps data
          }
        }
      }

      // Sort by count and take top 5
      const topApps: BarChartDataPoint[] = Object.entries(appCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([label, value]) => ({ label, value }));

      return {
        notificationTrend,
        topApps,
        focusTrend,
      };
    },
  });
}
