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
 * Arbitrary for generating valid AIPrediction entities (without id/createdAt which are auto-generated).
 * Note: notificationId must be provided separately since it references an existing notification.
 */
export const aiPredictionArbitrary = (notificationId: string) =>
  fc.record({
    notificationId: fc.constant(notificationId),
    predictedCategory: fc.constantFrom(...NOTIFICATION_CATEGORIES),
    confidence: fc.double({ min: 0, max: 1, noNaN: true }),
    matchedKeywords: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }).map((kws) =>
        JSON.stringify(kws)
      ),
      { nil: null }
    ),
  });
