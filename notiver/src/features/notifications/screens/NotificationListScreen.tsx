import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Filter, Bell } from 'lucide-react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import { Screen } from '@/src/shared/components/templates/Screen';
import { Header } from '@/src/shared/components/templates/Header';
import { EmptyState } from '@/src/shared/components/templates/EmptyState';
import { LoadingState } from '@/src/shared/components/templates/LoadingState';
import { SearchBar } from '@/src/shared/components/molecules/SearchBar';
import { Badge } from '@/src/shared/components/atoms/Badge';
import {
  NotificationCard,
  type NotificationCardData,
} from '@/src/shared/components/organisms/NotificationCard';
import { FilterSheet } from '../components/FilterSheet';
import { SortSelector } from '../components/SortSelector';
import { useNotificationStore } from '../store/notification.store';
import { useNotifications } from '../hooks/use-notifications';

/**
 * Memoized notification card wrapper to prevent unnecessary re-renders.
 * FlashList recycles views, so memoization helps avoid re-rendering
 * items that haven't changed when scrolling back into view.
 */
const MemoizedNotificationCard = memo(NotificationCard, (prev, next) => {
  return (
    prev.notification.id === next.notification.id &&
    prev.notification.isRead === next.notification.isRead &&
    prev.notification.category === next.notification.category
  );
});

export function NotificationListScreen() {
  const {
    filters,
    sort,
    setSearchQuery,
    setFilters,
    setSort,
    clearFilters,
  } = useNotificationStore();

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useNotifications(filters, sort);

  // Flatten paginated data
  const notifications = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flat() as unknown as NotificationCardData[];
  }, [data]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
    },
    [setSearchQuery]
  );

  const handleNotificationPress = useCallback((id: string) => {
    // Navigation to detail screen will be handled by the navigation stack
    // For now, this is a placeholder for the navigation integration
    console.log('Navigate to notification detail:', id);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleOpenFilters = useCallback(() => {
    setIsFilterSheetOpen(true);
    bottomSheetRef.current?.expand();
  }, []);

  const handleCloseFilters = useCallback(() => {
    setIsFilterSheetOpen(false);
    bottomSheetRef.current?.close();
  }, []);

  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category) count++;
    if (filters.appName) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.priority !== null) count++;
    if (filters.isRead !== null) count++;
    return count;
  }, [filters]);

  /**
   * Stable keyExtractor — avoids creating a new function on each render.
   */
  const keyExtractor = useCallback((item: NotificationCardData) => item.id, []);

  /**
   * Static content container style — avoids object recreation on each render.
   */
  const listContentStyle = useMemo(() => ({ paddingTop: 8, paddingBottom: 16 }), []);

  /**
   * Override item layout for FlashList optimization.
   * Provides consistent item height hints to reduce layout recalculations
   * and improve scroll performance toward 60fps target.
   */
  const overrideItemLayout = useCallback(
    (layout: { span?: number; size?: number }, _item: NotificationCardData) => {
      // Estimated height: card padding (12+12) + header (16) + title (20) + content (32) + badge (24) + margin (8) ≈ 124
      // Items without content/category will be shorter, but a consistent estimate helps FlashList
      layout.size = 108;
    },
    []
  );

  const renderNotificationItem = useCallback(
    ({ item }: { item: NotificationCardData }) => (
      <MemoizedNotificationCard
        notification={item}
        onPress={handleNotificationPress}
      />
    ),
    [handleNotificationPress]
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-lg items-center">
        <Text className="text-text-muted text-caption">Loading more...</Text>
      </View>
    );
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    const hasFilters =
      filters.searchQuery || activeFilterCount > 0;

    return (
      <EmptyState
        icon={Bell}
        title={hasFilters ? 'No matching notifications' : 'No notifications yet'}
        description={
          hasFilters
            ? 'Try adjusting your search or filters to find what you\'re looking for.'
            : 'Notifications will appear here once the notification listener is active.'
        }
        actionLabel={hasFilters ? 'Clear Filters' : undefined}
        onAction={hasFilters ? handleClearFilters : undefined}
      />
    );
  }, [isLoading, filters.searchQuery, activeFilterCount, handleClearFilters]);

  if (isLoading) {
    return (
      <Screen edges={['top']}>
        <Header title="Notifications" />
        <LoadingState message="Loading notifications..." />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <Header
        title="Notifications"
        actions={[
          {
            icon: Filter,
            onPress: handleOpenFilters,
            accessibilityLabel: `Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`,
          },
        ]}
      />

      {/* Search bar */}
      <View className="px-lg pb-sm">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search notifications..."
          debounceMs={300}
        />
      </View>

      {/* Active filters indicator + Sort */}
      <View className="px-lg pb-sm flex-row items-center justify-between">
        <SortSelector sort={sort} onSortChange={setSort} />
        {activeFilterCount > 0 && (
          <Pressable
            onPress={handleClearFilters}
            className="flex-row items-center"
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
          >
            <Badge
              label={`${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}`}
              variant="important"
            />
          </Pressable>
        )}
      </View>

      {/* Notification list */}
      <View className="flex-1">
        <FlashList
          data={notifications}
          renderItem={renderNotificationItem}
          estimatedItemSize={100}
          keyExtractor={keyExtractor}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          drawDistance={250}
          overrideItemLayout={overrideItemLayout}
        />
      </View>

      {/* Filter Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['60%']}
        enablePanDownToClose
        onClose={() => setIsFilterSheetOpen(false)}
        backgroundStyle={{ backgroundColor: '#111113' }}
        handleIndicatorStyle={{ backgroundColor: '#71717A' }}
      >
        <BottomSheetView>
          <FilterSheet
            filters={filters}
            onFiltersChange={setFilters}
            onClear={handleClearFilters}
            onClose={handleCloseFilters}
          />
        </BottomSheetView>
      </BottomSheet>
    </Screen>
  );
}
