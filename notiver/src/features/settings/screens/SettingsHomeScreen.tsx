import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
    BarChart3,
    Bell,
    Database,
    Download,
    FileText,
    Globe,
    Hash,
    HelpCircle,
    Info,
    Moon,
    Shield,
    ShieldCheck,
    Smartphone,
    Vibrate,
    Volume2,
    Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';

import { osInfoModule, type SystemInfo } from '@/src/native/os-info';
import { Header } from '@/src/shared/components/templates/Header';
import { Screen } from '@/src/shared/components/templates/Screen';
import { Section } from '@/src/shared/components/templates/Section';
import { colors } from '@/src/theme/tokens';

import { SettingToggle } from '../components/SettingToggle';
import { SettingValue } from '../components/SettingValue';
import { SETTINGS_KEYS, useSettings, useUpdateSetting } from '../hooks/use-settings';

const DATA_RETENTION_OPTIONS = ['7', '14', '30', '60', '90'];
const EXPORT_FREQUENCY_OPTIONS = ['daily', 'weekly', 'monthly', 'never'];
const MAX_RULES_OPTIONS = ['10', '20', '50', '100'];

function formatDuration(milliseconds: number | null): string {
  if (milliseconds === null) return 'Loading...';

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}

/**
 * Settings home screen with sections: General, Notifications, Automation,
 * Analytics, Privacy, System, Permissions, and About.
 *
 * Validates: Requirements 14.1, 14.2
 */
export function SettingsHomeScreen() {
  const router = useRouter();
  const { data: settings, isLoading } = useSettings();
  const { mutate: updateSetting } = useUpdateSetting();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

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

  const cycleSetting = useCallback(
    (key: string, options: string[], currentValue: string) => {
      const currentIndex = options.indexOf(currentValue);
      const nextIndex = (currentIndex + 1) % options.length;
      updateSetting({ key, value: options[nextIndex] });
    },
    [updateSetting]
  );

  useEffect(() => {
    let mounted = true;

    const refreshSystemInfo = async () => {
      const info = await osInfoModule.getSystemInfo();
      if (mounted) {
        setSystemInfo(info);
      }
    };

    void refreshSystemInfo();
    const intervalId = setInterval(() => {
      void refreshSystemInfo();
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const isAndroid = Platform.OS === 'android';

  const systemSummary = useMemo(() => {
    return {
      osLabel: systemInfo?.osName ?? (isAndroid ? 'Android' : Platform.OS),
      osVersion: systemInfo?.osVersion ?? String(Platform.Version),
      apiLevel: String(systemInfo?.sdkInt ?? Platform.Version),
      deviceLabel:
        [systemInfo?.manufacturer, systemInfo?.brand, systemInfo?.model]
          .filter(Boolean)
          .join(' ') || (isAndroid ? 'Android device' : 'Current device'),
      uptimeMs: systemInfo?.uptimeMs ?? null,
      bootTimeMs: systemInfo?.bootTimeMs ?? null,
    };
  }, [isAndroid, systemInfo]);

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

        <Section title="System" subtitle="Android device and OS data">
          <View className="bg-surface-card rounded-cards overflow-hidden">
            <SettingValue
              title="Device"
              subtitle="Manufacturer and model"
              icon={Smartphone}
              iconColor={colors.text.muted}
              value={systemSummary.deviceLabel}
            />
            <View className="h-px bg-border-subtle mx-lg" />
            <SettingValue
              title="OS"
              subtitle="Operating system and version"
              icon={Info}
              iconColor={colors.text.muted}
              value={`${systemSummary.osLabel} ${systemSummary.osVersion}`}
            />
            <View className="h-px bg-border-subtle mx-lg" />
            <SettingValue
              title="API Level"
              subtitle="Android platform version"
              icon={ShieldCheck}
              iconColor={colors.text.muted}
              value={systemSummary.apiLevel}
            />
            <View className="h-px bg-border-subtle mx-lg" />
            <SettingValue
              title="Uptime"
              subtitle="Refreshes while the app is open"
              icon={Shield}
              iconColor={colors.text.muted}
              value={formatDuration(systemSummary.uptimeMs)}
            />
            <View className="h-px bg-border-subtle mx-lg" />
            <SettingValue
              title="Boot Time"
              subtitle="Estimated system start time"
              icon={Database}
              iconColor={colors.text.muted}
              value={formatDuration(systemSummary.bootTimeMs)}
            />
          </View>
        </Section>

        <Section title="Permissions" subtitle="Open the Android permission center">
          <View className="bg-surface-card rounded-cards overflow-hidden">
            <SettingValue
              title="Android Permissions"
              subtitle="Notification access, accessibility, alarms, and battery optimization"
              icon={Shield}
              iconColor={colors.accent.primary}
              value="Open"
              showChevron
              onPress={() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                router.push('/permissions' as any);
              }}
            />
          </View>
        </Section>

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
