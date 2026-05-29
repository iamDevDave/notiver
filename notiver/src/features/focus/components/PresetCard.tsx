/**
 * PresetCard - Displays a focus preset option for selection.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  BookOpen,
  Briefcase,
  Moon,
  Users,
  Settings,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { FocusPreset } from '../engine/types';
import { PRESET_META, PRESET_DURATIONS } from '../store/focus-store';

const PRESET_ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Briefcase,
  Moon,
  Users,
  Settings,
};

export interface PresetCardProps {
  preset: FocusPreset;
  isSelected: boolean;
  onPress: (preset: FocusPreset) => void;
}

export function PresetCard({ preset, isSelected, onPress }: PresetCardProps) {
  const meta = PRESET_META[preset];
  const duration = PRESET_DURATIONS[preset];
  const Icon = PRESET_ICONS[meta.icon] ?? Settings;

  const formatDuration = (min: number): string => {
    if (min >= 60) {
      const hours = Math.floor(min / 60);
      const remaining = min % 60;
      return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
    }
    return `${min}m`;
  };

  return (
    <Pressable
      onPress={() => onPress(preset)}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label} preset, ${formatDuration(duration)}`}
      accessibilityState={{ selected: isSelected }}
      className={`flex-row items-center p-lg rounded-cards border ${
        isSelected
          ? 'border-accent-primary bg-accent-primary/10'
          : 'border-border bg-surface-card'
      }`}
    >
      <View
        className="w-12 h-12 rounded-full items-center justify-center"
        style={{ backgroundColor: `${meta.color}20` }}
      >
        <Icon size={24} color={meta.color} />
      </View>

      <View className="flex-1 ml-md">
        <Text className="text-text-primary text-body font-semibold">
          {meta.label}
        </Text>
        <Text className="text-text-muted text-caption mt-xs">
          {meta.description}
        </Text>
      </View>

      <Text className="text-text-secondary text-caption font-medium">
        {formatDuration(duration)}
      </Text>
    </Pressable>
  );
}
