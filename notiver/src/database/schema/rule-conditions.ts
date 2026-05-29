import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { rules } from './rules';

export type ConditionType =
  | 'contains'
  | 'not_contains'
  | 'regex'
  | 'category'
  | 'priority'
  | 'time_window';

export const ruleConditions = sqliteTable(
  'rule_conditions',
  {
    id: text('id').primaryKey(),
    ruleId: text('rule_id')
      .notNull()
      .references(() => rules.id, { onDelete: 'cascade' }),
    type: text('type').$type<ConditionType>().notNull(),
    config: text('config').notNull(),
    logicOperator: text('logic_operator').$type<'AND' | 'OR'>().default('AND'),
    orderIndex: integer('order_index').default(0),
  },
  (table) => ({
    /** Index for batch-loading conditions by ruleId during rule evaluation */
    ruleIdIdx: index('idx_rule_conditions_rule_id').on(table.ruleId),
  })
);
