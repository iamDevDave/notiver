import React, { useCallback } from 'react';
import { View, Text, Linking } from 'react-native';
import {
  Sun,
  Moon,
  Globe,
  Bell,
  Volume2,
  Vibrate,
  Zap,
  Hash,
  Database,
  Download,
  Shield,
  BarChart3,
  Info,
  FileText,
  HelpCircle,
} from 'lucide-react-native';
import Constants from 'expo-constants';

import { Screen } from '@/src/shared/components/templates/Screen';
import { Header } from '@/src/shared/components/templates/Header';
import { Section } from '@/src/shared/components/templates/Section';
import { useSettings, useUpdateSetting, SETTINGS_KEYS } from '../hooks/use-settings';
import { SettingToggle } from '../components/SettingToggle';
import { SettingValue } from '../components/SettingValue';
import { colors } from '@/src/theme/tokens';

const DATA_RETENTION_OPTIONS = ['7', '14', '30', '60', '90'];
const EXPORT_FREQUENCY_OPTIONS = ['daily', 'weekly', 'monthly', 'never'];
const MAX_RULES_OPTIONS = ['10', '20', '50', '100'];

/**
 * Settings home screen with sections: General, Notifications, Automation,
 * Analytics, Privacy, and About.
 *
 * Validates: Requirements 14.1, 14.2
 */
export function SettingsHomeScreen() {
  const { data: settings, isLoading } = useSettings();
  const { mutate: updateSetting } = useUpdateSetting();

  const getSetting = useCallback(
    (key: string, defaultValue: string = ''): string => {
      return settings?.[key] ?? defaultValue;
    },
    [settings]
  );

  const getBoolSetting = useCallback(
    (key: string, defaultValue: boolean = false): boolean => {
      const value = settings?.[key];
      if (value === undefined || value === null) return defaultValue;
      return value === 'true';
    },
    [settings]
  );

  const toggleSetting = useCallback(
    (key: string, currentValue: boolean) => {
      updateSetting({ key, value: (!currentValue).toString() });
    },
    [updateSetting]
  );

  const cycleSetting = useCallback(
    (key: string, options: string[], currentValue: string) => {
      const currentIndex = options.indexOf(currentValue);
      const nextIndex = (currentIndex + 1) % options.length;
      updateSetting({ key, value: options[nextIndex] });
    },
    [updateSetting]
  );

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  if (isLoading) {
    return (
      <Screen>
        <Header title="Settings" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-muted text-body">Loading settings...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable edges={['top']}>
      <Header title="Settings" />

      <View className="px-lg pt-md pb-xxxl">
        {/* General Section */}
        <Section title="General" subtitle="App appearance and language">
          <View className="bg-surface-card rounded-cards overflow-hidden">
            <SettingToggle
              title="Dark Theme"
              subtitle="Active (light theme coming soon)"
              icon={Moon}
              iconColor={colors.accent.primary}
              value={getSetting(SETTINGS_KEYS.theme, 'dark') === 'dark'}
              onValueChange={() => {
                // Dark theme is always active in MVP, light is disabled
              }}
              disabled
            />
            <View className="h-px bg-border-subtle mx-lg" />
            <SettingValue
              title="Language"
              subtitle="App display language"
              icon={Globe}
              iconColor={colors.accent.primary}
              value="English"
              showChevron
            />
          </View>
        </Section>

        {/* Notifications Section */}
        <Section title="Notifications" subtitle="Notification preferences and alerts">
          <View className="bg-surface-card rounded-cards overflow-hidden">
            <SettingValue
              title="Notification Preferences"
              subtitle="Manage notification categories"
              icon={Bell}
              iconColor={colors.accent.success}
              showChevron
            />
            <View className="h-px bg-border-subtle mx-lg" />
            <SettingToggle
              title="Sound"
              subtitle="Play sound for rule alerts"
              icon={Volume2}
              iconColor={colors.accent.success}
              value={getBoolSetting(SETTINGS_KEYS.notificationSound, true)}
              onValueChange={(value) =>
                updateSetting({ key: SETTINGS_KEYS.notificationSound, value: value.toString() })
              }
            />
            <View className="h-px bg-border-subtle mx-lg" />
            <SettingToggle
              title="Vibration"
              subtitle="Vibrate for rule alerts"
              icon={Vibrate}
              iconColor={colors.accent.success}
              value={getBoolSetting(SETTINGS_KEYS.notificationVibration, true)}
              onValueChange={(value) =>
                updateSetting({ key: SETTINGS_KEYS.notificationVibration, value: value.toString() })
              }
            />
          </View>
        </Section>

        {/* Automation Section */}
        <Section title="Automation" subtitle="Rule engine configuration">
          <View className="bg-surface-card rounded-cards overflow-hidden">
            <SettingToggle
              title="Rule Engine"
              subtitle="Enable automatic rule evaluation"
              icon={Zap}
              iconColor={colors.accent.warning}
              value={getBoolSetting(SETTINGS_KEYS.ruleEngineEnabled, true)}
              onValueChange={(value) =>
                updateSetting({ key: SETTINGS_KEYS.ruleEngineEnabled, value: value.toString() })
              }
            />
            <View className="h-px bg-border-subtle mx-lg" />
            <SettingValue
              title="Max Rules"
              subtitle="Maximum number of active rules"
              icon={Hash}
              iconColor={colors.accent.warning}
              value={getSetting(SETTINGS_KEYS.maxRules, '20')}
              onPress={() =>
                cycleSetting(
                  SETTINGS_KEYS.maxRules,
                  MAX_RULES_OPTIONS,
                  getSetting(SETTINGS_KEYS.maxRules, '20')
                )
              }
            />
          </View>
        </Section>

        {/* Analytics Section */}
        <Section title="Analytics" subtitle="Data retention and export settings">
          <View className="bg-surface-card rounded-cards overflow-hidden">
            <SettingValue
              title="Data Retention"
              subtitle="How long to keep notification data"
              icon={Database}
              iconColor={colors.accent.ai}
              value={`${getSetting(SETTINGS_KEYS.dataRetentionDays, '30')} days`}
              onPress={() =>
                cycleSetting(
                  SETTINGS_KEYS.dataRetentionDays,
                  DATA_RETENTION_OPTIONS,
                  getSetting(SETTINGS_KEYS.dataRetentionDays, '30')
                )
              }
            />
            <View className="h-px bg-border-subtle mx-lg" />
            <SettingValue
              title="Export Frequency"
              subtitle="Automatic data export schedule"
              icon={Download}
              iconColor={colors.accent.ai}
              value={getSetting(SETTINGS_KEYS.exportFrequency, 'weekly')}
              onPress={() =>
                cycleSetting(
                  SETTINGS_KEYS.exportFrequency,
                  EXPORT_FREQUENCY_OPTIONS,
                  getSetting(SETTINGS_KEYS.exportFrequency, 'weekly')
                )
              }
            />
          </View>
        </Section>

        {/* Privacy Section */}
        <Section title="Privacy" subtitle="Data collection preferences">
          <View className="bg-surface-card rounded-cards overflow-hidden">
            <SettingToggle
              title="Usage Analytics"
              subtitle="Help improve the app with anonymous usage data"
              icon={BarChart3}
              iconColor={colors.accent.danger}
              value={getBoolSetting(SETTINGS_KEYS.dataCollectionUsage, true)}
              onValueChange={(value) =>
                updateSetting({ key: SETTINGS_KEYS.dataCollectionUsage, value: value.toString() })
              }
            />
            <View className="h-px bg-border-subtle mx-lg" />
            <SettingToggle
              title="Crash Reports"
              subtitle="Send crash reports to help fix bugs"
              icon={Shield}
              iconColor={colors.accent.danger}
              value={getBoolSetting(SETTINGS_KEYS.dataCollectionCrash, true)}
              onValueChange={(value) =>
                updateSetting({ key: SETTINGS_KEYS.dataCollectionCrash, value: value.toString() })
              }
            />
          </View>
        </Section>

        {/* About Section */}
        <Section title="About" subtitle="App information and support">
          <View className="bg-surface-card rounded-cards overflow-hidden">
            <SettingValue
              title="Version"
              icon={Info}
              iconColor={colors.text.muted}
              value={appVersion}
            />
            <View className="h-px bg-border-subtle mx-lg" />
            <SettingValue
              title="Licenses"
              subtitle="Open source licenses"
              icon={FileText}
              iconColor={colors.text.muted}
              showChevron
            />
            <View className="h-px bg-border-subtle mx-lg" />
            <SettingValue
              title="Support"
              subtitle="Get help or report issues"
              icon={HelpCircle}
              iconColor={colors.text.muted}
              showChevron
              onPress={() => {
                Linking.openURL('https://github.com/notiver/notiver/issues');
              }}
            />
          </View>
        </Section>
      </View>
    </Screen>
  );
}
