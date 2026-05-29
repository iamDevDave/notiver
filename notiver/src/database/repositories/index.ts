import { NotificationRepository } from './notification.repository';
import { RuleRepository } from './rule.repository';
import { RuleExecutionRepository } from './rule-execution.repository';
import { AnalyticsRepository } from './analytics.repository';
import { FocusSessionRepository } from './focus-session.repository';
import { SettingsRepository } from './settings.repository';
import { AIPredictionRepository } from './ai-prediction.repository';

// BaseRepository is not instantiated here; a plain re-export is fine.
export { BaseRepository } from './base.repository';

// Re-export the imported classes so the public surface is unchanged while the
// names remain usable as local bindings for the singleton declarations below.
export {
  NotificationRepository,
  RuleRepository,
  RuleExecutionRepository,
  AnalyticsRepository,
  FocusSessionRepository,
  SettingsRepository,
  AIPredictionRepository,
};

// Singleton instances for use across the application
export const notificationRepository = new NotificationRepository();
export const ruleRepository = new RuleRepository();
export const ruleExecutionRepository = new RuleExecutionRepository();
export const analyticsRepository = new AnalyticsRepository();
export const focusSessionRepository = new FocusSessionRepository();
export const settingsRepository = new SettingsRepository();
export const aiPredictionRepository = new AIPredictionRepository();
