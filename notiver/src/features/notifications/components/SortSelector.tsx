import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react-native';
import type { SortField, SortDirection, NotificationSortOptions } from '../store/notification.store';

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'date', label: 'Date' },
  { field: 'priority', label: 'Priority' },
  { field: 'app', label: 'App' },
];

export interface SortSelectorProps {
  sort: NotificationSortOptions;
  onSortChange: (sort: NotificationSortOptions) => void;
  className?: string;
}

export function SortSelector({ sort, onSortChange, className = '' }: SortSelectorProps) {
  const handleSortPress = (field: SortField) => {
    if (sort.field === field) {
      // Toggle direction
      const newDirection: SortDirection = sort.direction === 'desc' ? 'asc' : 'desc';
      onSortChange({ field, direction: newDirection });
    } else {
      // New field, default to desc
      onSortChange({ field, direction: 'desc' });
    }
  };

  return (
    <View className={`flex-row items-center gap-sm ${className}`}>
      <ArrowUpDown size={14} color="#71717A" />
      {SORT_OPTIONS.map((opt) => {
        const isActive = sort.field === opt.field;
        const DirectionIcon =
          isActive && sort.direction === 'asc' ? ArrowUp : ArrowDown;

        return (
          <Pressable
            key={opt.field}
            onPress={() => handleSortPress(opt.field)}
            className={`flex-row items-center px-sm py-xs rounded-buttons ${
              isActive ? 'bg-accent-primary/20' : 'bg-surface-elevated'
            }`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Sort by ${opt.label}${isActive ? `, ${sort.direction}ending` : ''}`}
          >
            <Text
              className={`text-caption font-medium ${
                isActive ? 'text-accent-primary' : 'text-text-muted'
              }`}
            >
              {opt.label}
            </Text>
            {isActive && (
              <DirectionIcon size={12} color="#3B82F6" style={{ marginLeft: 2 }} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
