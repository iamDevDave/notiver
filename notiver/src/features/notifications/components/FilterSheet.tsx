import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { Badge } from '@/src/shared/components/atoms/Badge';
import { Button } from '@/src/shared/components/atoms/Button';
import type { NotificationCategory } from '@/src/database/schema/notifications';
import type { NotificationFilters } from '../store/notification.store';

const CATEGORIES: NotificationCategory[] = [
  'important',
  'work',
  'social',
  'spam',
  'promotion',
  'emergency',
];

const PRIORITY_OPTIONS = [
  { label: 'Any', value: null },
  { label: 'Low (1+)', value: 1 },
  { label: 'Medium (2+)', value: 2 },
  { label: 'High (3+)', value: 3 },
  { label: 'Critical (4+)', value: 4 },
];

const READ_STATUS_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Unread', value: false },
  { label: 'Read', value: true },
];

export interface FilterSheetProps {
  filters: NotificationFilters;
  onFiltersChange: (filters: Partial<NotificationFilters>) => void;
  onClear: () => void;
  onClose: () => void;
}

export function FilterSheet({
  filters,
  onFiltersChange,
  onClear,
  onClose,
}: FilterSheetProps) {
  const handleCategorySelect = useCallback(
    (category: NotificationCategory | null) => {
      onFiltersChange({ category: filters.category === category ? null : category });
    },
    [filters.category, onFiltersChange]
  );

  const handlePrioritySelect = useCallback(
    (priority: number | null) => {
      onFiltersChange({ priority });
    },
    [onFiltersChange]
  );

  const handleReadStatusSelect = useCallback(
    (isRead: boolean | null) => {
      onFiltersChange({ isRead });
    },
    [onFiltersChange]
  );

  const hasActiveFilters =
    filters.category !== null ||
    filters.priority !== null ||
    filters.isRead !== null ||
    filters.appName !== null ||
    filters.dateFrom !== null ||
    filters.dateTo !== null;

  return (
    <View className="bg-background-secondary rounded-t-modals px-lg pt-lg pb-xxxl">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-xl">
        <Text className="text-text-primary text-md font-bold">Filters</Text>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close filters"
        >
          <X size={22} color="#A1A1AA" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Category filter */}
        <View className="mb-xl">
          <Text className="text-text-secondary text-body font-medium mb-sm">
            Category
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => handleCategorySelect(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: filters.category === cat }}
                accessibilityLabel={`Filter by ${cat}`}
              >
                <Badge
                  label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  variant={filters.category === cat ? cat : 'default'}
                  className={filters.category === cat ? 'border border-accent-primary' : ''}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Priority filter */}
        <View className="mb-xl">
          <Text className="text-text-secondary text-body font-medium mb-sm">
            Priority
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            {PRIORITY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => handlePrioritySelect(opt.value)}
                className={`px-md py-sm rounded-buttons border ${
                  filters.priority === opt.value
                    ? 'bg-accent-primary/20 border-accent-primary'
                    : 'bg-surface-elevated border-border'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: filters.priority === opt.value }}
                accessibilityLabel={`Priority: ${opt.label}`}
              >
                <Text
                  className={`text-caption font-medium ${
                    filters.priority === opt.value
                      ? 'text-accent-primary'
                      : 'text-text-secondary'
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Read status filter */}
        <View className="mb-xl">
          <Text className="text-text-secondary text-body font-medium mb-sm">
            Read Status
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            {READ_STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => handleReadStatusSelect(opt.value)}
                className={`px-md py-sm rounded-buttons border ${
                  filters.isRead === opt.value
                    ? 'bg-accent-primary/20 border-accent-primary'
                    : 'bg-surface-elevated border-border'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: filters.isRead === opt.value }}
                accessibilityLabel={`Status: ${opt.label}`}
              >
                <Text
                  className={`text-caption font-medium ${
                    filters.isRead === opt.value
                      ? 'text-accent-primary'
                      : 'text-text-secondary'
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View className="flex-row gap-sm mt-lg">
        {hasActiveFilters && (
          <Button
            label="Clear All"
            variant="ghost"
            size="md"
            onPress={onClear}
            className="flex-1"
          />
        )}
        <Button
          label="Apply"
          variant="primary"
          size="md"
          onPress={onClose}
          className="flex-1"
        />
      </View>
    </View>
  );
}
