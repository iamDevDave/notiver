import React from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  Bell,
  Hand,
  BatteryCharging,
  AlarmClock,
  Server,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { PermissionInfo, PermissionType } from '../hooks/usePermissions';

export interface PermissionCardProps {
  permission: PermissionInfo;
  onEnable: (type: PermissionType) => void;
}

const PERMISSION_ICONS: Record<PermissionType, LucideIcon> = {
  notification_access: Bell,
  accessibility_service: Hand,
  battery_optimization: BatteryCharging,
  alarm_permission: AlarmClock,
  foreground_service: Server,
};

export function PermissionCard({ permission, onEnable }: PermissionCardProps) {
  const IconComponent = PERMISSION_ICONS[permission.type];
  const isGranted = permission.status === 'granted';
  const isForegroundService = permission.type === 'foreground_service';

  return (
    <View
      className="bg-surface-card rounded-cards border border-border p-lg mb-md"
      accessibilityRole="summary"
      accessibilityLabel={`${permission.name} permission, ${isGranted ? 'granted' : 'not granted'}`}
    >
      {/* Header row: icon, name, status badge */}
      <View className="flex-row items-center justify-between mb-sm">
        <View className="flex-row items-center flex-1">
          <View
            className={`w-10 h-10 rounded-full items-center justify-center mr-md ${
              isGranted ? 'bg-accent-success/20' : 'bg-surface-elevated'
            }`}
          >
            <IconComponent
              size={20}
              color={isGranted ? '#10B981' : '#A1A1AA'}
            />
          </View>
          <View className="flex-1">
            <Text className="text-text-primary text-body font-semibold">
              {permission.name}
            </Text>
            <Text className="text-text-muted text-caption mt-xs">
              {permission.description}
            </Text>
          </View>
        </View>

        {/* Status badge */}
        <View
          className={`flex-row items-center px-2.5 py-1 rounded-full ${
            isGranted ? 'bg-accent-success/20' : 'bg-accent-warning/20'
          }`}
        >
          {isGranted ? (
            <CheckCircle2 size={12} color="#10B981" />
          ) : (
            <XCircle size={12} color="#F59E0B" />
          )}
          <Text
            className={`text-xs font-medium ml-1 ${
              isGranted ? 'text-accent-success' : 'text-accent-warning'
            }`}
          >
            {isGranted ? 'Granted' : 'Not Granted'}
          </Text>
        </View>
      </View>

      {/* Explanation text when not granted */}
      {!isGranted && !isForegroundService && (
        <View className="bg-surface-elevated rounded-buttons p-md mt-sm mb-md">
          <Text className="text-text-muted text-caption leading-5">
            {permission.explanation}
          </Text>
        </View>
      )}

      {/* Enable button — only show for non-granted, non-foreground-service permissions */}
      {!isGranted && !isForegroundService && (
        <Pressable
          onPress={() => onEnable(permission.type)}
          className="flex-row items-center justify-center bg-accent-primary rounded-buttons py-2.5 mt-sm"
          style={({ pressed }) => (pressed ? { opacity: 0.8 } : undefined)}
          accessibilityRole="button"
          accessibilityLabel={`Enable ${permission.name}`}
          accessibilityHint="Opens Android system settings for this permission"
        >
          <ExternalLink size={16} color="#FFFFFF" />
          <Text className="text-white text-sm font-semibold ml-2">
            Enable in Settings
          </Text>
        </Pressable>
      )}
    </View>
  );
}
