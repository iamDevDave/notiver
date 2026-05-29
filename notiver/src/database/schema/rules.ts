import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export type TriggerType =
  | 'app'
  | 'keyword'
  | 'contact'
  | 'time'
  | 'location'
  | 'frequency';

export const rules = sqliteTable(
  'rules',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    triggerType: text('trigger_type').$type<TriggerType>().notNull(),
    triggerConfig: text('trigger_config').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    priority: integer('priority').default(0),
    executionCount: integer('execution_count').default(0),
    lastTriggeredAt: integer('last_triggered_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    /** Index for findActive() query — filters by isActive, sorts by priority */
    isActivePriorityIdx: index('idx_rules_active_priority').on(
      table.isActive,
      table.priority
    ),
    /** Index for findByTriggerType() query */
    triggerTypeIdx: index('idx_rules_trigger_type').on(table.triggerType),
  })
);
