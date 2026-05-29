import { settingsRepository } from '../repositories';
import { seedCategories } from './categories';
import { seedRuleTemplates } from './rule-templates';
import { seedSettings } from './settings';

const SEED_APPLIED_KEY = 'seed_applied';

/**
 * Runs all seed functions on first database creation only.
 * Checks for a 'seed_applied' flag in settings to avoid re-seeding.
 */
export async function runSeed(): Promise<void> {
  const seedApplied = await settingsRepository.get(SEED_APPLIED_KEY);

  if (seedApplied === 'true') {
    return;
  }

  await seedSettings();
  await seedCategories();
  await seedRuleTemplates();

  // Mark seed as applied so it won't run again
  await settingsRepository.set(SEED_APPLIED_KEY, 'true');
}
