import React from 'react';
import { View, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';

export interface StatCardProps {
  /** Label describing the metric */
  label: string;
  /** The metric value to display prominently */
  value: string | number;
  /** Optional icon displayed alongside the metric */
  icon?: LucideIcon;
  /** Icon color override */
  iconColor?: string;
  /** Optional percentage change indicator (positive or negative) */
  change?: number;
  /** Additional NativeWind classes */
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: IconComponent,
  iconColor = '#3B82F6',
  change,
  className = '',
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const changeColor = isPositive ? '#10B981' : '#EF4444';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <View
      className={`bg-surface-card rounded-cards border border-border p-lg ${className}`}
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${value}${change !== undefined ? `, ${isPositive ? 'up' : 'down'} ${Math.abs(change)}%` : ''}`}
    >
      <View className="flex-row items-center justify-between mb-sm">
        <Text className="text-text-secondary text-caption font-medium">
          {label}
        </Text>
        {IconComponent ? (
          <View className="bg-surface-elevated rounded-full p-sm">
            <IconComponent size={16} color={iconColor} />
          </View>
        ) : null}
      </View>

      <Text className="text-text-primary text-lg font-bold">{value}</Text>

      {change !== undefined ? (
        <View className="flex-row items-center mt-sm">
          <TrendIcon size={14} color={changeColor} />
          <Text
            className="text-caption ml-xs font-medium"
            style={{ color: changeColor }}
          >
            {isPositive ? '+' : ''}
            {change}%
          </Text>
        </View>
      ) : null}
    </View>
  );
}
