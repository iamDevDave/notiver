/**
 * ScheduleConfig - Optional time-based schedule configuration for focus mode.
 *
 * Allows users to set recurring focus schedules with start/end times and day selection.
 */

import React from 'react';
import { View, Text, Pressable, Switch } from 'react-native';
import { ArrowLeft, Clock } from 'lucide-react-native';
import type { ScheduleConfig as ScheduleConfigType } from '../store/focus-store';

const DAYS = [
  { key: 0, label: 'S', full: 'Sunday' },
  { key: 1, label: 'M', full: 'Monday' },
  { key: 2, label: 'T', full: 'Tuesday' },
  { key: 3, label: 'W', full: 'Wednesday' },
  { key: 4, label: 'T', full: 'Thursday' },
  { key: 5, label: 'F', full: 'Friday' },
  { key: 6, label: 'S', full: 'Saturday' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

export interface ScheduleConfigProps {
  schedule: ScheduleConfigType;
  onUpdate: (schedule: Partial<ScheduleConfigType>) => void;
  onBack: () => void;
}

export function ScheduleConfig({ schedule, onUpdate, onBack }: ScheduleConfigProps) {
  const formatTime = (hour: number, minute: number): string => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const toggleDay = (day: number) => {
    const days = schedule.days.includes(day)
      ? schedule.days.filter((d) => d !== day)
      : [...schedule.days, day].sort();
    onUpdate({ days });
  };

  const cycleHour = (field: 'startHour' | 'endHour', direction: 1 | -1) => {
    const current = schedule[field];
    const next = (current + direction + 24) % 24;
    onUpdate({ [field]: next });
  };

  const cycleMinute = (field: 'startMinute' | 'endMinute', direction: 1 | -1) => {
    const current = schedule[field];
    const next = (current + direction * 15 + 60) % 60;
    onUpdate({ [field]: next });
  };

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="flex-row items-center px-lg py-md">
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="p-sm mr-sm rounded-full"
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="flex-1 text-text-primary text-lg font-bold">
          Schedule
        </Text>
      </View>

      {/* Enable toggle */}
      <View className="flex-row items-center justify-between mx-lg mb-lg p-lg bg-surface-card rounded-cards border border-border">
        <View className="flex-row items-center flex-1">
          <Clock size={20} color="#3B82F6" />
          <View className="ml-md">
            <Text className="text-text-primary text-body font-semibold">
              Auto-start Schedule
            </Text>
            <Text className="text-text-muted text-caption mt-xs">
              Automatically start focus mode at set times
            </Text>
          </View>
        </View>
        <Switch
          value={schedule.enabled}
          onValueChange={(enabled) => onUpdate({ enabled })}
          trackColor={{ false: '#27272A', true: '#3B82F6' }}
          thumbColor="#FFFFFF"
          accessibilityLabel="Enable auto-start schedule"
        />
      </View>

      {schedule.enabled && (
        <>
          {/* Day selection */}
          <View className="mx-lg mb-lg">
            <Text className="text-text-secondary text-caption font-semibold mb-sm uppercase">
              Days
            </Text>
            <View className="flex-row gap-xs">
              {DAYS.map((day) => {
                const isActive = schedule.days.includes(day.key);
                return (
                  <Pressable
                    key={day.key}
                    onPress={() => toggleDay(day.key)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isActive }}
                    accessibilityLabel={day.full}
                    className={`flex-1 items-center py-sm rounded-buttons ${
                      isActive
                        ? 'bg-accent-primary'
                        : 'bg-surface-elevated border border-border'
                    }`}
                  >
                    <Text
                      className={`text-caption font-semibold ${
                        isActive ? 'text-white' : 'text-text-muted'
                      }`}
                    >
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Start time */}
          <View className="mx-lg mb-md">
            <Text className="text-text-secondary text-caption font-semibold mb-sm uppercase">
              Start Time
            </Text>
            <View className="flex-row items-center bg-surface-card rounded-cards border border-border p-md">
              <Pressable
                onPress={() => cycleHour('startHour', -1)}
                accessibilityRole="button"
                accessibilityLabel="Decrease start hour"
                className="px-md py-xs"
              >
                <Text className="text-text-secondary text-body">−</Text>
              </Pressable>
              <Text className="flex-1 text-center text-text-primary text-body font-semibold">
                {formatTime(schedule.startHour, schedule.startMinute)}
              </Text>
              <Pressable
                onPress={() => cycleHour('startHour', 1)}
                accessibilityRole="button"
                accessibilityLabel="Increase start hour"
                className="px-md py-xs"
              >
                <Text className="text-text-secondary text-body">+</Text>
              </Pressable>
              <View className="w-px h-6 bg-border mx-sm" />
              <Pressable
                onPress={() => cycleMinute('startMinute', -1)}
                accessibilityRole="button"
                accessibilityLabel="Decrease start minute"
                className="px-md py-xs"
              >
                <Text className="text-text-secondary text-caption">−15m</Text>
              </Pressable>
              <Pressable
                onPress={() => cycleMinute('startMinute', 1)}
                accessibilityRole="button"
                accessibilityLabel="Increase start minute"
                className="px-md py-xs"
              >
                <Text className="text-text-secondary text-caption">+15m</Text>
              </Pressable>
            </View>
          </View>

          {/* End time */}
          <View className="mx-lg mb-lg">
            <Text className="text-text-secondary text-caption font-semibold mb-sm uppercase">
              End Time
            </Text>
            <View className="flex-row items-center bg-surface-card rounded-cards border border-border p-md">
              <Pressable
                onPress={() => cycleHour('endHour', -1)}
                accessibilityRole="button"
                accessibilityLabel="Decrease end hour"
                className="px-md py-xs"
              >
                <Text className="text-text-secondary text-body">−</Text>
              </Pressable>
              <Text className="flex-1 text-center text-text-primary text-body font-semibold">
                {formatTime(schedule.endHour, schedule.endMinute)}
              </Text>
              <Pressable
                onPress={() => cycleHour('endHour', 1)}
                accessibilityRole="button"
                accessibilityLabel="Increase end hour"
                className="px-md py-xs"
              >
                <Text className="text-text-secondary text-body">+</Text>
              </Pressable>
              <View className="w-px h-6 bg-border mx-sm" />
              <Pressable
                onPress={() => cycleMinute('endMinute', -1)}
                accessibilityRole="button"
                accessibilityLabel="Decrease end minute"
                className="px-md py-xs"
              >
                <Text className="text-text-secondary text-caption">−15m</Text>
              </Pressable>
              <Pressable
                onPress={() => cycleMinute('endMinute', 1)}
                accessibilityRole="button"
                accessibilityLabel="Increase end minute"
                className="px-md py-xs"
              >
                <Text className="text-text-secondary text-caption">+15m</Text>
              </Pressable>
            </View>
          </View>

          {/* Summary */}
          <View className="mx-lg p-lg bg-surface-elevated rounded-cards">
            <Text className="text-text-secondary text-caption">
              Focus mode will auto-start at{' '}
              <Text className="text-text-primary font-semibold">
                {formatTime(schedule.startHour, schedule.startMinute)}
              </Text>{' '}
              and end at{' '}
              <Text className="text-text-primary font-semibold">
                {formatTime(schedule.endHour, schedule.endMinute)}
              </Text>{' '}
              on{' '}
              <Text className="text-text-primary font-semibold">
                {schedule.days.length === 7
                  ? 'every day'
                  : schedule.days.length === 5 &&
                    schedule.days.every((d) => d >= 1 && d <= 5)
                  ? 'weekdays'
                  : schedule.days
                      .map((d) => DAYS[d].full)
                      .join(', ')}
              </Text>
              .
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
