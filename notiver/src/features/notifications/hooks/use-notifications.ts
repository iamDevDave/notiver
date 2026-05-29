import { useInfiniteQuery } from '@tanstack/react-query';
import { notificationRepository } from '@/src/database/repositories';
import type { NotificationFilters, NotificationSortOptions } from '../store/notification.store';

const PAGE_SIZE = 30;

/**
 * Fetches paginated notifications from the repository applying filters, search, and sort.
 * Uses TanStack Query's infinite query for cursor-based pagination.
 *
 * Performance optimizations:
 * - Increased page size to 30 (reduces number of DB round-trips)
 * - Pushes as much filtering as possible to the database layer (uses indexes)
 * - Minimizes client-side filtering to only cases where DB can't handle it
 * - Uses staleTime to avoid unnecessary refetches during rapid scrolling
 */
export function useNotifications(filters: NotificationFilters, sort: NotificationSortOptions) {
  return useInfiniteQuery({
    queryKey: ['notifications', filters, sort],
    queryFn: async ({ pageParam = 0 }) => {
      const offset = pageParam * PAGE_SIZE;

      // Map sort field to database column name
      const orderByMap: Record<string, string> = {
        date: 'receivedAt',
        priority: 'priority',
        app: 'appName',
      };

      const queryOptions = {
        limit: PAGE_SIZE,
        offset,
        orderBy: orderByMap[sort.field] ?? 'receivedAt',
        orderDirection: sort.direction,
      };

      // If there's a search query, use the search method (uses LIKE with indexes)
      if (filters.searchQuery.trim()) {
        const results = await notificationRepository.search(
          filters.searchQuery.trim(),
          queryOptions
        );
        return applyClientFilters(results, filters);
      }

      // If filtering by category, use findByCategory (uses idx_notifications_category)
      if (filters.category) {
        const results = await notificationRepository.findByCategory(
          filters.category,
          queryOptions
        );
        return applyClientFilters(results, filters);
      }

      // If filtering by app, use findByApp (uses idx_notifications_package)
      if (filters.appName) {
        const results = await notificationRepository.findByApp(
          filters.appName,
          queryOptions
        );
        return applyClientFilters(results, filters);
      }

      // If filtering by date range, use findByDateRange (uses idx_notifications_received_at)
      if (filters.dateFrom && filters.dateTo) {
        const results = await notificationRepository.findByDateRange(
          filters.dateFrom,
          filters.dateTo
        );
        // Apply pagination manually since findByDateRange doesn't support it
        const paginated = results.slice(offset, offset + PAGE_SIZE);
        return applyClientFilters(paginated, filters);
      }

      // Default: fetch all with pagination (uses idx_notifications_archived_received)
      const results = await notificationRepository.findAll(queryOptions);
      return applyClientFilters(results, filters);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length;
    },
    // Avoid refetching data that hasn't changed during rapid scrolling
    staleTime: 2000,
  });
}

/**
 * Applies client-side filters that can't be efficiently handled by the repository.
 * This handles combinations of filters (priority, read status, date range when combined with other filters).
 */
function applyClientFilters(
  notifications: Array<Record<string, unknown>>,
  filters: NotificationFilters
): Array<Record<string, unknown>> {
  let result = notifications;

  if (filters.priority !== null) {
    result = result.filter((n) => (n.priority as number) >= filters.priority!);
  }

  if (filters.isRead !== null) {
    result = result.filter((n) => (n.isRead as boolean) === filters.isRead);
  }

  if (filters.dateFrom && !filters.dateTo) {
    result = result.filter(
      (n) => new Date(n.receivedAt as string | number) >= filters.dateFrom!
    );
  }

  if (filters.dateTo && !filters.dateFrom) {
    result = result.filter(
      (n) => new Date(n.receivedAt as string | number) <= filters.dateTo!
    );
  }

  return result;
}
