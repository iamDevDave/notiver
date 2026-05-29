import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const analytics = sqliteTable(
  'analytics',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    hour: integer('hour'),
    notificationCount: integer('notification_count').default(0),
    ruleTriggeredCount: integer('rule_triggered_count').default(0),
    focusMinutes: integer('focus_minutes').default(0),
    distractionCount: integer('distraction_count').default(0),
    topApps: text('top_apps'),
    categoryBreakdown: text('category_breakdown'),
  },
  (table) => ({
    dateIdx: index('idx_analytics_date').on(table.date),
    dateHourIdx: index('idx_analytics_date_hour').on(table.date, table.hour),
  })
);
