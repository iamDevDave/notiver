import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { RefreshCw, ShieldCheck } from 'lucide-react-native';
import { Screen } from '../../../shared/components/templates/Screen';
import { PermissionCard } from '../components/PermissionCard';
import { usePermissions } from '../hooks/usePermissions';

/**
 * Permission Center screen displaying all required Android permissions
 * with their current status, explanations, and deep links to settings.
 *
 * BuzzKill-inspired design: dark cards with gold/yellow checkmarks for granted permissions.
 */
export function PermissionCenterScreen() {
  const {
    permissions,
    isRefreshing,
    grantedCount,
    totalCount,
    checkPermissions,
    openSettings,
  } = usePermissions();

  return (
    <Screen scrollable edges={['top', 'bottom']}>
      <View className="px-lg py-xl">
        {/* Header */}
        <View className="items-center mb-xxl">
          <View className="w-16 h-16 rounded-full bg-accent-primary/20 items-center justify-center mb-lg">
            <ShieldCheck size={32} color="#3B82F6" />
          </View>
          <Text className="text-text-primary text-xl font-bold text-center">
            Permission Center
          </Text>
          <Text className="text-text-secondary text-body text-center mt-sm">
            Grant permissions to unlock full functionality
          </Text>
        </View>

        {/* Progress indicator */}
        <View className="bg-surface-card rounded-buttons p-md flex-row items-center justify-between mb-xl">
          <View>
            <Text className="text-text-primary text-body font-semibold">
              {grantedCount} of {totalCount} granted
            </Text>
            <Text className="text-text-muted text-caption mt-xs">
              {grantedCount === totalCount
                ? 'All permissions granted'
                : 'Some features may be limited'}
            </Text>
          </View>
          {/* Refresh button */}
          <Pressable
            onPress={checkPermissions}
            disabled={isRefreshing}
            className={`w-10 h-10 rounded-full bg-surface-elevated items-center justify-center ${
              isRefreshing ? 'opacity-50' : ''
            }`}
            accessibilityRole="button"
            accessibilityLabel="Refresh permission statuses"
          >
            <RefreshCw size={18} color="#A1A1AA" />
          </Pressable>
        </View>

        {/* Permission cards */}
        {permissions.map((permission) => (
          <PermissionCard
            key={permission.type}
            permission={permission}
            onEnable={openSettings}
          />
        ))}

        {/* Footer note */}
        <View className="mt-lg px-md">
          <Text className="text-text-muted text-caption text-center leading-5">
            Permissions can be changed at any time from Android Settings. Tap
            the refresh button above after granting permissions to update
            statuses.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
