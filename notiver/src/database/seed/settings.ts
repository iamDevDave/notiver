import { settingsRepository } from '../repositories';

/**
 * Default application settings seeded on first database creation.
 */
const DEFAULT_SETTINGS: Record<string, string> = {
  theme: 'dark',
  notification_sound: 'true',
  notification_vibration: 'true',
  rule_engine_enabled: 'true',
  max_rules: '20',
  data_retention_days: '30',
  analytics_enabled: 'true',
};

/**
 * Seeds default application settings into the settings table.
 */
export async function seedSettings(): Promise<void> {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await settingsRepository.set(key, value);
  }
}
