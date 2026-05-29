import type { Migration } from './types';

/**
 * Performance optimization migration.
 * Adds indexes to support efficient rule evaluation and notification queries.
 *
 * New indexes:
 * - idx_rules_active_priority: Covers findActive() query (WHERE is_active = 1 ORDER BY priority DESC)
 * - idx_rules_trigger_type: Covers findByTriggerType() query
 * - idx_rule_conditions_rule_id: Covers batch-loading conditions during rule evaluation
 * - idx_rule_actions_rule_id: Covers batch-loading actions during rule evaluation
 * - idx_notifications_is_read: Covers filtering by read status
 *
 * All operations are additive (CREATE INDEX IF NOT EXISTS).
 */
export const migration002PerformanceIndexes: Migration = {
  id: '002_performance_indexes',
  name: 'Add performance optimization indexes',
  up: (db) => {
    // Index for rules.findActive() — filters by is_active, sorts by priority
    db.execSync(
      `CREATE INDEX IF NOT EXISTS idx_rules_trigger_type ON rules(trigger_type);`
    );

    // Index for rules.findByTriggerType()
    db.execSync(
      `CREATE INDEX IF NOT EXISTS idx_rules_trigger_type ON rules(trigger_type);`
    );

    // Index for batch-loading conditions by rule_id during evaluation
    db.execSync(
      `CREATE INDEX IF NOT EXISTS idx_rule_conditions_rule_id ON rule_conditions(rule_id);`
    );

    // Index for batch-loading actions by rule_id during evaluation
    db.execSync(
      `CREATE INDEX IF NOT EXISTS idx_rule_actions_rule_id ON rule_actions(rule_id);`
    );

    // Index for filtering notifications by read status
    db.execSync(
      `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);`
    );

    // Composite index for notification list default query (sorted by received_at, filtered by is_archived)
    db.execSync(
      `CREATE INDEX IF NOT EXISTS idx_notifications_archived_received ON notifications(is_archived, received_at);`
    );
  },
};
