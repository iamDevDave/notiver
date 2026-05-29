import * as fc from 'fast-check';
import type { NotificationCategory } from '../../database/schema/notifications';

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'important',
  'work',
  'social',
  'spam',
  'promotion',
  'emergency',
];

/**
 * Arbitrary for generating valid Notification entities (without id/createdAt which are auto-generated).
 */
export const notificationArbitrary = fc.record({
  packageName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  appName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  title: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  content: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  sender: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
  category: fc.option(fc.constantFrom(...NOTIFICATION_CATEGORIES), { nil: null }),
  priority: fc.integer({ min: 0, max: 10 }),
  isRead: fc.boolean(),
  isArchived: fc.boolean(),
  rawData: fc.option(fc.constant(null), { nil: null }),
  receivedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
});

/**
 * Arbitrary for generating partial notification updates.
 */
export const notificationUpdateArbitrary = fc.record({
  title: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  content: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  isRead: fc.option(fc.boolean(), { nil: undefined }),
  isArchived: fc.option(fc.boolean(), { nil: undefined }),
  priority: fc.option(fc.integer({ min: 0, max: 10 }), { nil: undefined }),
}).filter((update) => Object.values(update).some((v) => v !== undefined));
