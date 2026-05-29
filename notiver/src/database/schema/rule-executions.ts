import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { rules } from './rules';
import { notifications } from './notifications';

export type ExecutionStatus = 'success' | 'partial' | 'failed';

export const ruleExecutions = sqliteTable(
  'rule_executions',
  {
    id: text('id').primaryKey(),
    ruleId: text('rule_id')
      .notNull()
      .references(() => rules.id),
    notificationId: text('notification_id').references(
      () => notifications.id
    ),
    status: text('status').$type<ExecutionStatus>().notNull(),
    actionsExecuted: text('actions_executed').notNull(),
    errorDetails: text('error_details'),
    durationMs: integer('duration_ms'),
    executedAt: integer('executed_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    ruleIdx: index('idx_executions_rule').on(table.ruleId),
    executedAtIdx: index('idx_executions_executed_at').on(table.executedAt),
  })
);
