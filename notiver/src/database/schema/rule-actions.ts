import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { rules } from './rules';

export type ActionType =
  | 'dismiss'
  | 'delay'
  | 'alarm'
  | 'vibrate'
  | 'reply'
  | 'launch_app'
  | 'batch'
  | 'webhook'
  | 'copy'
  | 'speak'
  | 'click'
  | 'expand';

export const ruleActions = sqliteTable(
  'rule_actions',
  {
    id: text('id').primaryKey(),
    ruleId: text('rule_id')
      .notNull()
      .references(() => rules.id, { onDelete: 'cascade' }),
    type: text('type').$type<ActionType>().notNull(),
    config: text('config').notNull(),
    orderIndex: integer('order_index').default(0),
  },
  (table) => ({
    /** Index for batch-loading actions by ruleId during rule evaluation */
    ruleIdIdx: index('idx_rule_actions_rule_id').on(table.ruleId),
  })
);
