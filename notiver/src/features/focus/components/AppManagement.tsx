/**
 * AppManagement - Manages app whitelist/blacklist for focus mode.
 *
 * Provides an installed app picker with toggle between blocked and allowed lists.
 * Since we can't access the real installed apps list without a native module,
 * we provide a text input for package names and show common app suggestions.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, FlatList } from 'react-native';
import {
  Plus,
  X,
  Shield,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react-native';

export type AppListMode = 'blocked' | 'allowed';

/** Common apps that users might want to block/allow */
const SUGGESTED_APPS = [
  { packageName: 'com.instagram.android', label: 'Instagram' },
  { packageName: 'com.facebook.katana', label: 'Facebook' },
  { packageName: 'com.twitter.android', label: 'X (Twitter)' },
  { packageName: 'com.whatsapp', label: 'WhatsApp' },
  { packageName: 'com.snapchat.android', label: 'Snapchat' },
  { packageName: 'com.google.android.youtube', label: 'YouTube' },
  { packageName: 'com.reddit.frontpage', label: 'Reddit' },
  { packageName: 'com.zhiliaoapp.musically', label: 'TikTok' },
  { packageName: 'com.discord', label: 'Discord' },
  { packageName: 'org.telegram.messenger', label: 'Telegram' },
  { packageName: 'com.linkedin.android', label: 'LinkedIn' },
  { packageName: 'com.spotify.music', label: 'Spotify' },
];

export interface AppManagementProps {
  blockedApps: string[];
  allowedApps: string[];
  onAddBlocked: (packageName: string) => void;
  onRemoveBlocked: (packageName: string) => void;
  onAddAllowed: (packageName: string) => void;
  onRemoveAllowed: (packageName: string) => void;
  onBack: () => void;
}

export function AppManagement({
  blockedApps,
  allowedApps,
  onAddBlocked,
  onRemoveBlocked,
  onAddAllowed,
  onRemoveAllowed,
  onBack,
}: AppManagementProps) {
  const [mode, setMode] = useState<AppListMode>('blocked');
  const [customInput, setCustomInput] = useState('');

  const currentList = mode === 'blocked' ? blockedApps : allowedApps;
  const onAdd = mode === 'blocked' ? onAddBlocked : onAddAllowed;
  const onRemove = mode === 'blocked' ? onRemoveBlocked : onRemoveAllowed;

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !currentList.includes(trimmed)) {
      onAdd(trimmed);
      setCustomInput('');
    }
  };

  const getAppLabel = (packageName: string): string => {
    const found = SUGGESTED_APPS.find((app) => app.packageName === packageName);
    return found ? found.label : packageName;
  };

  const availableSuggestions = SUGGESTED_APPS.filter(
    (app) => !currentList.includes(app.packageName)
  );

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
          Manage Apps
        </Text>
      </View>

      {/* Mode toggle */}
      <View className="flex-row mx-lg mb-lg rounded-buttons bg-surface-elevated p-xs">
        <Pressable
          onPress={() => setMode('blocked')}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'blocked' }}
          className={`flex-1 flex-row items-center justify-center py-sm rounded-buttons ${
            mode === 'blocked' ? 'bg-accent-danger/20' : ''
          }`}
        >
          <Shield size={16} color={mode === 'blocked' ? '#EF4444' : '#71717A'} />
          <Text
            className={`ml-xs text-caption font-semibold ${
              mode === 'blocked' ? 'text-accent-danger' : 'text-text-muted'
            }`}
          >
            Blocked ({blockedApps.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode('allowed')}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'allowed' }}
          className={`flex-1 flex-row items-center justify-center py-sm rounded-buttons ${
            mode === 'allowed' ? 'bg-accent-success/20' : ''
          }`}
        >
          <ShieldCheck size={16} color={mode === 'allowed' ? '#10B981' : '#71717A'} />
          <Text
            className={`ml-xs text-caption font-semibold ${
              mode === 'allowed' ? 'text-accent-success' : 'text-text-muted'
            }`}
          >
            Allowed ({allowedApps.length})
          </Text>
        </Pressable>
      </View>

      {/* Custom input */}
      <View className="flex-row items-center mx-lg mb-md gap-sm">
        <TextInput
          value={customInput}
          onChangeText={setCustomInput}
          placeholder="com.example.app"
          placeholderTextColor="#71717A"
          onSubmitEditing={handleAddCustom}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
          className="flex-1 bg-surface-elevated border border-border rounded-inputs px-md py-sm text-text-primary text-body"
        />
        <Pressable
          onPress={handleAddCustom}
          disabled={!customInput.trim()}
          accessibilityRole="button"
          accessibilityLabel="Add app"
          className={`w-10 h-10 rounded-buttons items-center justify-center ${
            customInput.trim() ? 'bg-accent-primary' : 'bg-surface-elevated'
          }`}
        >
          <Plus size={20} color={customInput.trim() ? '#FFFFFF' : '#71717A'} />
        </Pressable>
      </View>

      {/* Current list */}
      {currentList.length > 0 && (
        <View className="mx-lg mb-lg">
          <Text className="text-text-secondary text-caption font-semibold mb-sm uppercase">
            {mode === 'blocked' ? 'Blocked Apps' : 'Allowed Apps'}
          </Text>
          {currentList.map((packageName) => (
            <View
              key={packageName}
              className="flex-row items-center py-sm px-md bg-surface-card rounded-inputs mb-xs border border-border"
            >
              <Text className="flex-1 text-text-primary text-body" numberOfLines={1}>
                {getAppLabel(packageName)}
              </Text>
              <Pressable
                onPress={() => onRemove(packageName)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${getAppLabel(packageName)}`}
                hitSlop={8}
                className="p-xs"
              >
                <X size={16} color="#EF4444" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Suggestions */}
      {availableSuggestions.length > 0 && (
        <View className="mx-lg flex-1">
          <Text className="text-text-secondary text-caption font-semibold mb-sm uppercase">
            Suggestions
          </Text>
          <FlatList
            data={availableSuggestions}
            keyExtractor={(item) => item.packageName}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onAdd(item.packageName)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.label} to ${mode} list`}
                className="flex-row items-center py-sm px-md bg-surface-elevated rounded-inputs mb-xs"
              >
                <Text className="flex-1 text-text-primary text-body">
                  {item.label}
                </Text>
                <Text className="text-text-muted text-caption mr-sm" numberOfLines={1}>
                  {item.packageName}
                </Text>
                <Plus size={16} color="#3B82F6" />
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}
