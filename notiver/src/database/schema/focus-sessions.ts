import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export type FocusPreset = 'study' | 'work' | 'sleep' | 'meeting' | 'custom';

export type FocusSessionStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export const focusSessions = sqliteTable('focus_sessions', {
  id: text('id').primaryKey(),
  preset: text('preset').$type<FocusPreset>().notNull(),
  status: text('status').$type<FocusSessionStatus>().notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  plannedDurationMin: integer('planned_duration_min').notNull(),
  actualDurationMin: integer('actual_duration_min'),
  blockedCount: integer('blocked_count').default(0),
  interruptionCount: integer('interruption_count').default(0),
  blockedApps: text('blocked_apps'),
  allowedApps: text('allowed_apps'),
});
