import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export type NotificationCategory =
  | 'important'
  | 'work'
  | 'social'
  | 'spam'
  | 'promotion'
  | 'emergency';

export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    packageName: text('package_name').notNull(),
    appName: text('app_name').notNull(),
    title: text('title'),
    content: text('content'),
    sender: text('sender'),
    category: text('category').$type<NotificationCategory>(),
    priority: integer('priority').default(0),
    isRead: integer('is_read', { mode: 'boolean' }).default(false),
    isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
    rawData: text('raw_data'),
    receivedAt: integer('received_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    categoryIdx: index('idx_notifications_category').on(table.category),
    packageIdx: index('idx_notifications_package').on(table.packageName),
    receivedAtIdx: index('idx_notifications_received_at').on(table.receivedAt),
    appCategoryIdx: index('idx_notifications_app_category').on(
      table.packageName,
      table.category
    ),
  })
);
