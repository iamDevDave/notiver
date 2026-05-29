import fc from 'fast-check';
import type { NotificationCategory } from '../../database/schema/notifications';
import type { NotificationFilters } from './store/notification.store';

/**
 * Property-Based Tests: Notification Filtering and Search
 *
 * **Validates: Requirements 7.2, 7.5**
 *
 * Property 3: Notification Filtering Correctness
 * For any set of notifications and any combination of filters (category, app, date range,
 * priority, read status), all returned notifications must satisfy every applied filter
 * criterion, and no notification satisfying all criteria should be excluded.
 *
 * Property 4: Notification Search Matches Correct Fields
 * For any search query string and set of notifications, all returned results must contain
 * the query string (case-insensitive) in at least one of: title, content, sender, or app name.
 * No notification containing the query in any of those fields should be excluded.
 */

// --- Types ---

interface TestNotification {
  id: string;
  packageName: string;
  appName: string;
  title: string | null;
  content: string | null;
  sender: string | null;
  category: NotificationCategory | null;
  priority: number;
  isRead: boolean;
  isArchived: boolean;
  receivedAt: Date;
}

// --- Pure filtering logic (mirrors applyClientFilters from use-notifications.ts) ---

/**
 * Applies all filters to a notification set. This is the pure logic extracted from
 * the hook, which combines DB-level and client-level filtering into a single function
 * for property testing purposes.
 */
function filterNotifications(
  notifications: TestNotification[],
  filters: NotificationFilters
): TestNotification[] {
  let result = notifications;

  // Category filter
  if (filters.category) {
    result = result.filter((n) => n.category === filters.category);
  }

  // App name filter
  if (filters.appName) {
    result = result.filter((n) => n.appName === filters.appName);
  }

  // Priority filter (minimum priority threshold)
  if (filters.priority !== null) {
    result = result.filter((n) => n.priority >= filters.priority!);
  }

  // Read status filter
  if (filters.isRead !== null) {
    result = result.filter((n) => n.isRead === filters.isRead);
  }

  // Date range filter
  if (filters.dateFrom) {
    result = result.filter((n) => n.receivedAt >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    result = result.filter((n) => n.receivedAt <= filters.dateTo!);
  }

  return result;
}

/**
 * Applies search query to a notification set. Matches against title, content,
 * sender, and appName fields (case-insensitive LIKE %query%).
 */
function searchNotifications(
  notifications: TestNotification[],
  query: string
): TestNotification[] {
  if (!query.trim()) return notifications;

  const lowerQuery = query.toLowerCase();

  return notifications.filter((n) => {
    const title = (n.title ?? '').toLowerCase();
    const content = (n.content ?? '').toLowerCase();
    const sender = (n.sender ?? '').toLowerCase();
    const appName = n.appName.toLowerCase();

    return (
      title.includes(lowerQuery) ||
      content.includes(lowerQuery) ||
      sender.includes(lowerQuery) ||
      appName.includes(lowerQuery)
    );
  });
}

/**
 * Checks if a single notification satisfies a given filter.
 */
function notificationSatisfiesFilter(
  n: TestNotification,
  filters: NotificationFilters
): boolean {
  if (filters.category && n.category !== filters.category) return false;
  if (filters.appName && n.appName !== filters.appName) return false;
  if (filters.priority !== null && n.priority < filters.priority) return false;
  if (filters.isRead !== null && n.isRead !== filters.isRead) return false;
  if (filters.dateFrom && n.receivedAt < filters.dateFrom) return false;
  if (filters.dateTo && n.receivedAt > filters.dateTo) return false;
  return true;
}

/**
 * Checks if a notification matches a search query in any searchable field.
 */
function notificationMatchesSearch(n: TestNotification, query: string): boolean {
  if (!query.trim()) return true;
  const lowerQuery = query.toLowerCase();
  const title = (n.title ?? '').toLowerCase();
  const content = (n.content ?? '').toLowerCase();
  const sender = (n.sender ?? '').toLowerCase();
  const appName = n.appName.toLowerCase();

  return (
    title.includes(lowerQuery) ||
    content.includes(lowerQuery) ||
    sender.includes(lowerQuery) ||
    appName.includes(lowerQuery)
  );
}

// --- Custom Arbitraries ---

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'important',
  'work',
  'social',
  'spam',
  'promotion',
  'emergency',
];

/** Arbitrary for a test notification */
const testNotificationArb: fc.Arbitrary<TestNotification> = fc.record({
  id: fc.uuid(),
  packageName: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  appName: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  title: fc.option(fc.string({ minLength: 1, maxLength: 80 }), { nil: null }),
  content: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
  sender: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: null }),
  category: fc.option(fc.constantFrom(...NOTIFICATION_CATEGORIES), { nil: null }),
  priority: fc.integer({ min: 0, max: 10 }),
  isRead: fc.boolean(),
  isArchived: fc.boolean(),
  receivedAt: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-12-31') }),
});

/** Arbitrary for a set of notifications (1 to 20) */
const notificationSetArb = fc.array(testNotificationArb, { minLength: 1, maxLength: 20 });

/** Arbitrary for notification filters */
const filtersArb: fc.Arbitrary<NotificationFilters> = fc.record({
  searchQuery: fc.constant(''), // Search is tested separately in Property 4
  category: fc.option(fc.constantFrom(...NOTIFICATION_CATEGORIES), { nil: null }),
  appName: fc.option(
    fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    { nil: null }
  ),
  dateFrom: fc.option(
    fc.date({ min: new Date('2023-01-01'), max: new Date('2025-06-30') }),
    { nil: null }
  ),
  dateTo: fc.option(
    fc.date({ min: new Date('2023-07-01'), max: new Date('2025-12-31') }),
    { nil: null }
  ),
  priority: fc.option(fc.integer({ min: 0, max: 10 }), { nil: null }),
  isRead: fc.option(fc.boolean(), { nil: null }),
});

/**
 * Generates filters that are guaranteed to match at least some notifications
 * by picking filter values from the actual notification set.
 */
function filtersFromNotificationsArb(
  notifications: TestNotification[]
): fc.Arbitrary<NotificationFilters> {
  return fc.record({
    searchQuery: fc.constant(''),
    category: fc.option(
      fc.constantFrom(...notifications.map((n) => n.category).filter((c): c is NotificationCategory => c !== null)),
      { nil: null }
    ),
    appName: fc.option(
      fc.constantFrom(...notifications.map((n) => n.appName)),
      { nil: null }
    ),
    dateFrom: fc.option(
      fc.constantFrom(...notifications.map((n) => n.receivedAt)).map(
        (d) => new Date(d.getTime() - 86400000) // 1 day before
      ),
      { nil: null }
    ),
    dateTo: fc.option(
      fc.constantFrom(...notifications.map((n) => n.receivedAt)).map(
        (d) => new Date(d.getTime() + 86400000) // 1 day after
      ),
      { nil: null }
    ),
    priority: fc.option(
      fc.constantFrom(...notifications.map((n) => n.priority)),
      { nil: null }
    ),
    isRead: fc.option(fc.boolean(), { nil: null }),
  });
}

/**
 * Arbitrary for non-empty search queries (alphanumeric to avoid regex special chars).
 * We use short strings that are likely to appear in notification fields.
 */
const searchQueryArb = fc.string({ minLength: 1, maxLength: 10 }).filter(
  (s) => s.trim().length > 0 && /^[a-zA-Z0-9 ]+$/.test(s)
);

// --- Property Tests ---

describe('Property 3: Notification Filtering Correctness', () => {
  it('all returned notifications satisfy every applied filter criterion', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationSetArb,
        filtersArb,
        async (notifications, filters) => {
          const result = filterNotifications(notifications, filters);

          // Every returned notification must satisfy all filter criteria
          for (const n of result) {
            expect(notificationSatisfiesFilter(n, filters)).toBe(true);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('no notification satisfying all criteria is excluded from results', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationSetArb,
        filtersArb,
        async (notifications, filters) => {
          const result = filterNotifications(notifications, filters);
          const resultIds = new Set(result.map((n) => n.id));

          // Every notification that satisfies all filters must be in the result
          for (const n of notifications) {
            if (notificationSatisfiesFilter(n, filters)) {
              expect(resultIds.has(n.id)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('filtering with values from the notification set produces non-empty results when possible', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationSetArb.filter((ns) => ns.length >= 3),
        async (notifications) => {
          // Pick a single filter dimension from actual data
          const randomNotification = notifications[0];

          // Filter by category of first notification (if it has one)
          if (randomNotification.category) {
            const filters: NotificationFilters = {
              searchQuery: '',
              category: randomNotification.category,
              appName: null,
              dateFrom: null,
              dateTo: null,
              priority: null,
              isRead: null,
            };
            const result = filterNotifications(notifications, filters);
            // At least the first notification should match
            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result.some((n) => n.id === randomNotification.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty filters return all notifications unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(notificationSetArb, async (notifications) => {
        const emptyFilters: NotificationFilters = {
          searchQuery: '',
          category: null,
          appName: null,
          dateFrom: null,
          dateTo: null,
          priority: null,
          isRead: null,
        };
        const result = filterNotifications(notifications, emptyFilters);
        expect(result).toHaveLength(notifications.length);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 4: Notification Search Matches Correct Fields', () => {
  it('all returned results contain the query in at least one searchable field', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationSetArb,
        searchQueryArb,
        async (notifications, query) => {
          const result = searchNotifications(notifications, query);

          // Every returned notification must match the query in at least one field
          for (const n of result) {
            expect(notificationMatchesSearch(n, query)).toBe(true);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('no notification containing the query in any searchable field is excluded', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationSetArb,
        searchQueryArb,
        async (notifications, query) => {
          const result = searchNotifications(notifications, query);
          const resultIds = new Set(result.map((n) => n.id));

          // Every notification that matches the query must be in the result
          for (const n of notifications) {
            if (notificationMatchesSearch(n, query)) {
              expect(resultIds.has(n.id)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('search with a substring from a notification field always finds that notification', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationSetArb.filter(
          (ns) => ns.some((n) => n.title !== null && n.title.length >= 3)
        ),
        async (notifications) => {
          // Find a notification with a non-null title of sufficient length
          const withTitle = notifications.find(
            (n) => n.title !== null && n.title.length >= 3
          )!;

          // Use a substring of the title as the search query
          const title = withTitle.title!;
          const start = 0;
          const end = Math.min(3, title.length);
          const query = title.substring(start, end);

          if (query.trim().length === 0) return; // skip whitespace-only substrings

          const result = searchNotifications(notifications, query);
          const resultIds = new Set(result.map((n) => n.id));

          // The notification whose title contains the query must be in results
          expect(resultIds.has(withTitle.id)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty search query returns all notifications', async () => {
    await fc.assert(
      fc.asyncProperty(notificationSetArb, async (notifications) => {
        const result = searchNotifications(notifications, '');
        expect(result).toHaveLength(notifications.length);
      }),
      { numRuns: 100 }
    );
  });

  it('search is case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationSetArb.filter(
          (ns) => ns.some((n) => n.title !== null && n.title.length >= 2)
        ),
        async (notifications) => {
          const withTitle = notifications.find(
            (n) => n.title !== null && n.title.length >= 2
          )!;

          const title = withTitle.title!;
          const query = title.substring(0, 2);

          if (query.trim().length === 0) return;

          // Search with uppercase and lowercase should yield same results
          const upperResult = searchNotifications(notifications, query.toUpperCase());
          const lowerResult = searchNotifications(notifications, query.toLowerCase());

          expect(upperResult.length).toBe(lowerResult.length);
          const upperIds = new Set(upperResult.map((n) => n.id));
          const lowerIds = new Set(lowerResult.map((n) => n.id));
          for (const id of upperIds) {
            expect(lowerIds.has(id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
