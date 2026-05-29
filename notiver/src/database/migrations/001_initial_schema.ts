import type { Migration } from './types';

/**
 * Initial schema migration.
 * Creates all tables and indexes for the Notification Intelligence Platform.
 * All operations are additive (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS).
 */
export const migration001InitialSchema: Migration = {
  id: '001_initial_schema',
  name: 'Create initial database schema',
  up: (db) => {
    // --- notifications table ---
    db.execSync(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY NOT NULL,
        package_name TEXT NOT NULL,
        app_name TEXT NOT NULL,
        title TEXT,
        content TEXT,
        sender TEXT,
        category TEXT,
        priority INTEGER DEFAULT 0,
        is_read INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        raw_data TEXT,
        received_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    db.execSync(`CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_notifications_package ON notifications(package_name);`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_notifications_received_at ON notifications(received_at);`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_notifications_app_category ON notifications(package_name, category);`);

    // --- rules table ---
    db.execSync(`
      CREATE TABLE IF NOT EXISTS rules (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        trigger_type TEXT NOT NULL,
        trigger_config TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        priority INTEGER DEFAULT 0,
        execution_count INTEGER DEFAULT 0,
        last_triggered_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // --- rule_conditions table ---
    db.execSync(`
      CREATE TABLE IF NOT EXISTS rule_conditions (
        id TEXT PRIMARY KEY NOT NULL,
        rule_id TEXT NOT NULL,
        type TEXT NOT NULL,
        config TEXT NOT NULL,
        logic_operator TEXT DEFAULT 'AND',
        order_index INTEGER DEFAULT 0,
        FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
      );
    `);

    // --- rule_actions table ---
    db.execSync(`
      CREATE TABLE IF NOT EXISTS rule_actions (
        id TEXT PRIMARY KEY NOT NULL,
        rule_id TEXT NOT NULL,
        type TEXT NOT NULL,
        config TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
      );
    `);

    // --- rule_executions table ---
    db.execSync(`
      CREATE TABLE IF NOT EXISTS rule_executions (
        id TEXT PRIMARY KEY NOT NULL,
        rule_id TEXT NOT NULL,
        notification_id TEXT,
        status TEXT NOT NULL,
        actions_executed TEXT NOT NULL,
        error_details TEXT,
        duration_ms INTEGER,
        executed_at INTEGER NOT NULL,
        FOREIGN KEY (rule_id) REFERENCES rules(id),
        FOREIGN KEY (notification_id) REFERENCES notifications(id)
      );
    `);

    db.execSync(`CREATE INDEX IF NOT EXISTS idx_executions_rule ON rule_executions(rule_id);`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON rule_executions(executed_at);`);

    // --- analytics table ---
    db.execSync(`
      CREATE TABLE IF NOT EXISTS analytics (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        hour INTEGER,
        notification_count INTEGER DEFAULT 0,
        rule_triggered_count INTEGER DEFAULT 0,
        focus_minutes INTEGER DEFAULT 0,
        distraction_count INTEGER DEFAULT 0,
        top_apps TEXT,
        category_breakdown TEXT
      );
    `);

    db.execSync(`CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_analytics_date_hour ON analytics(date, hour);`);

    // --- focus_sessions table ---
    db.execSync(`
      CREATE TABLE IF NOT EXISTS focus_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        preset TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        planned_duration_min INTEGER NOT NULL,
        actual_duration_min INTEGER,
        blocked_count INTEGER DEFAULT 0,
        interruption_count INTEGER DEFAULT 0,
        blocked_apps TEXT,
        allowed_apps TEXT
      );
    `);

    // --- settings table ---
    db.execSync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // --- ai_predictions table ---
    db.execSync(`
      CREATE TABLE IF NOT EXISTS ai_predictions (
        id TEXT PRIMARY KEY NOT NULL,
        notification_id TEXT NOT NULL,
        predicted_category TEXT NOT NULL,
        confidence REAL NOT NULL,
        matched_keywords TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (notification_id) REFERENCES notifications(id)
      );
    `);

    db.execSync(`CREATE INDEX IF NOT EXISTS idx_predictions_notification ON ai_predictions(notification_id);`);
  },
};
