import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsRepository } from '@/src/database/repositories';

/** Keys for all application settings */
export const SETTINGS_KEYS = {
  theme: 'theme',
  language: 'language',
  notificationSound: 'notification_sound',
  notificationVibration: 'notification_vibration',
  notificationPreferences: 'notification_preferences',
  ruleEngineEnabled: 'rule_engine_enabled',
  maxRules: 'max_rules',
  dataRetentionDays: 'data_retention_days',
  exportFrequency: 'export_frequency',
  analyticsEnabled: 'analytics_enabled',
  dataCollectionUsage: 'data_collection_usage',
  dataCollectionCrash: 'data_collection_crash',
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

/**
 * Hook to fetch all settings as a key-value map.
 */
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const allSettings = await settingsRepository.getAll();
      const map: Record<string, string> = {};
      for (const setting of allSettings) {
        map[setting.key] = setting.value;
      }
      return map;
    },
  });
}

/**
 * Hook to fetch a single setting value.
 */
export function useSetting(key: string) {
  return useQuery({
    queryKey: ['settings', key],
    queryFn: () => settingsRepository.get(key),
  });
}

/**
 * Hook to update a setting value with optimistic updates.
 */
export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await settingsRepository.set(key, value);
    },
    onMutate: async ({ key, value }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['settings'] });
      await queryClient.cancelQueries({ queryKey: ['settings', key] });

      // Snapshot previous values
      const previousSettings = queryClient.getQueryData<Record<string, string>>(['settings']);
      const previousValue = queryClient.getQueryData<string | null>(['settings', key]);

      // Optimistically update
      if (previousSettings) {
        queryClient.setQueryData(['settings'], { ...previousSettings, [key]: value });
      }
      queryClient.setQueryData(['settings', key], value);

      return { previousSettings, previousValue };
    },
    onError: (_err, { key }, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(['settings'], context.previousSettings);
      }
      if (context?.previousValue !== undefined) {
        queryClient.setQueryData(['settings', key], context.previousValue);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
