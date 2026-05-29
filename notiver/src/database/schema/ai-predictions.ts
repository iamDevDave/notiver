import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { notifications, type NotificationCategory } from './notifications';

export const aiPredictions = sqliteTable(
  'ai_predictions',
  {
    id: text('id').primaryKey(),
    notificationId: text('notification_id')
      .notNull()
      .references(() => notifications.id),
    predictedCategory: text('predicted_category')
      .$type<NotificationCategory>()
      .notNull(),
    confidence: real('confidence').notNull(),
    matchedKeywords: text('matched_keywords'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    notificationIdx: index('idx_predictions_notification').on(
      table.notificationId
    ),
  })
);
