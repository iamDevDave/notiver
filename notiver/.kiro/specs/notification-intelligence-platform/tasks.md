# Implementation Plan: Notification Intelligence Platform

## Overview

This plan implements the Notification Intelligence Platform as a phased build following clean architecture principles. Tasks are sequenced by dependency: foundational layers (project setup, design system, database) first, then core engines (notification, AI, rules), then UI features (dashboard, history, focus, analytics), and finally integration (settings, navigation polish). Each task is a discrete coding step building on prior work.

## Tasks

- [x] 1. Project Configuration and Architecture Setup
  - [x] 1.1 Configure expo-dev-client and project dependencies
    - Install expo-dev-client, zustand, @tanstack/react-query, drizzle-orm, expo-sqlite, nativewind, react-native-mmkv, fast-check
    - Configure app.json for Android-only with New Architecture enabled
    - Set up TypeScript strict mode in tsconfig.json
    - Remove iOS configuration and web-only dependencies
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Create feature-based folder structure under src/
    - Create directories: src/app, src/core, src/shared, src/features/{dashboard,notifications,rules,analytics,focus,settings,ai,onboarding,auth}, src/database, src/services, src/navigation, src/native, src/theme, src/types, src/config
    - Create src/core/errors/ with AppError base class and error hierarchy (DatabaseError, ValidationError, NativeModuleError, RuleExecutionError, ImportError)
    - Create src/core/constants/ with app-wide constants
    - Create src/core/base/ with base repository interface IRepository<T, ID>
    - _Requirements: 1.4, 1.5_

  - [x] 1.3 Set up state management infrastructure
    - Configure Zustand store factory pattern in src/shared/hooks/
    - Set up TanStack Query client with default options in src/app/providers/
    - Create event bus service in src/services/event-bus/ implementing IEventBus interface
    - Create root provider component wrapping QueryClientProvider
    - _Requirements: 1.5_


- [x] 2. Design System Foundation
  - [x] 2.1 Create theme tokens and NativeWind configuration
    - Define dark theme tokens in src/theme/tokens.ts: background (#09090B, #111113, #18181B), surface (#18181B, #202024), text (#FFFFFF, #A1A1AA, #71717A), accent (#3B82F6, #10B981, #F59E0B, #EF4444, #8B5CF6)
    - Define typography scale: XL 32px, LG 24px, MD 20px, Body 16px, Caption 12px
    - Define border radius tokens: Cards 20px, Buttons 16px, Inputs 16px, Modals 24px
    - Configure NativeWind with custom theme in tailwind.config.js
    - Create ThemeProvider in src/theme/provider.tsx
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Build atomic components (atoms)
    - Implement Button component with variants (primary, secondary, danger, ghost) and sizes
    - Implement Input component with label, error state, and icon support
    - Implement Badge component with color variants matching categories
    - Implement Avatar component with image and fallback initials
    - Implement Skeleton loading component with shimmer animation
    - Implement Icon component wrapping @expo/vector-icons
    - Place all in src/shared/components/atoms/
    - _Requirements: 2.4_


  - [x] 2.3 Build molecule and organism components
    - Implement Card molecule with header, body, footer slots
    - Implement StatCard molecule for dashboard metrics display
    - Implement ChartCard molecule wrapping chart components
    - Implement ListItem molecule with icon, title, subtitle, trailing action
    - Implement SearchBar molecule with debounced input
    - Place molecules in src/shared/components/molecules/
    - _Requirements: 2.4_

  - [x] 2.4 Build layout and template components
    - Implement Screen template with SafeAreaView, status bar, and scroll handling
    - Implement Header component with title, back button, and action slots
    - Implement PageContainer with consistent padding and max-width
    - Implement Section component with title and content area
    - Implement BottomSheet component using react-native-gesture-handler
    - Implement Dialog/Modal component with overlay
    - Implement EmptyState, ErrorState, LoadingState feedback components
    - Place in src/shared/components/templates/
    - _Requirements: 2.5_

- [x] 3. Database Layer
  - [x] 3.1 Set up SQLite with Drizzle ORM and define schema
    - Configure expo-sqlite connection in src/database/index.ts
    - Define all Drizzle table schemas in src/database/schema/: notifications, rules, rule_conditions, rule_actions, rule_executions, analytics, focus_sessions, settings, ai_predictions
    - Add all indexes as specified in design (category, package, receivedAt, composite indexes)
    - _Requirements: 4.1, 4.5_


  - [x] 3.2 Implement database migrations system
    - Create migration runner in src/database/migrations/ that applies migrations incrementally
    - Write initial migration (001_initial_schema) creating all tables and indexes
    - Implement migration version tracking to prevent re-application
    - Ensure migrations are non-destructive (additive only, no data loss)
    - _Requirements: 4.2_

  - [x] 3.3 Implement repository layer
    - Create base repository class implementing IRepository<T, ID> with CRUD, count, and batch operations
    - Implement NotificationRepository with findByApp, findByCategory, findByDateRange, search, batchInsert
    - Implement RuleRepository with findActive, findByTriggerType
    - Implement RuleExecutionRepository with findByRule, findByNotification
    - Implement AnalyticsRepository with findByDate, findByDateRange, upsert
    - Implement FocusSessionRepository with findActive, findByDateRange
    - Implement SettingsRepository with get, set, getAll
    - Implement AIPredictionRepository with findByNotification
    - Place all in src/database/repositories/
    - _Requirements: 4.3_

  - [x]* 3.4 Write property tests for repository CRUD round-trip
    - **Property 1: Repository CRUD Round-Trip**
    - Create custom arbitraries in __tests__/arbitraries/ for Notification, Rule, FocusSession, Setting, AIPrediction
    - Test create → findById produces equivalent entity for each repository
    - Test update → findById reflects changes
    - Test delete → findById returns null
    - **Validates: Requirements 4.3, 5.3**


  - [x] 3.5 Implement seed data
    - Create seed runner in src/database/seed/
    - Seed default notification categories
    - Seed rule templates (e.g., "Silence spam", "Alert on urgent")
    - Seed default application settings (theme, notification preferences)
    - Run seed on first database creation only
    - _Requirements: 4.4_

- [x] 4. Checkpoint - Foundation layers complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Navigation System
  - [x] 5.1 Configure bottom tab navigation
    - Set up bottom tab navigator in src/navigation/bottom-tabs.tsx with 5 tabs: Dashboard, Notifications, Rules, Analytics, Settings
    - Style tabs with design system tokens (dark background, accent active color)
    - Add tab icons using @expo/vector-icons
    - _Requirements: 15.1_

  - [x] 5.2 Configure stack and modal navigation
    - Create stack navigators for each tab in src/navigation/stacks/: DashboardStack, NotificationsStack, RulesStack, AnalyticsStack, SettingsStack
    - Configure modal navigation for RuleBuilder and FocusMode in src/navigation/modals/
    - Set up OnboardingModal as initial route for first launch
    - Wire all navigators into root layout in src/app/
    - _Requirements: 15.2, 15.3_


- [x] 6. Onboarding and Permissions
  - [x] 6.1 Implement onboarding flow screens
    - Create splash screen component with logo, loading animation, version number, and status text in src/features/onboarding/screens/
    - Create onboarding page components: Welcome, Automation, Analytics, AI, Cloud Sync
    - Implement horizontal pager with progress dots indicator
    - Store onboarding completion flag in MMKV
    - _Requirements: 3.1, 3.2_

  - [x] 6.2 Implement permission center
    - Create PermissionCenterScreen in src/features/onboarding/screens/
    - Implement permission cards for: Notification Access, Accessibility Service, Battery Optimization, Alarm Permission, Foreground Service
    - Implement permission status checking using native module bridge
    - Implement deep linking to Android system settings for each permission type
    - Display explanation text when permission is not granted showing limited functionality
    - _Requirements: 3.3, 3.4, 3.5, 3.6_

- [x] 7. Notification Engine
  - [x] 7.1 Create native notification listener bridge
    - Create Android NotificationListenerService native module in src/native/notification-listener/
    - Implement INotificationListenerBridge interface: isRunning(), requestRestart(), onNotificationReceived()
    - Bridge native events to React Native via NativeEventEmitter
    - Implement service status monitoring and warning indicator when not running
    - _Requirements: 5.1, 5.6_


  - [x] 7.2 Implement notification parser service
    - Create notification parser in src/services/notification/parser.ts
    - Extract fields from raw notification: packageName, appName, title, content, sender, timestamp, priority
    - Handle edge cases: null fields, empty content, malformed data
    - Return typed Notification entity
    - _Requirements: 5.2_

  - [x]* 7.3 Write property test for notification parsing
    - **Property 2: Notification Parsing Extracts All Fields**
    - Generate arbitrary raw notification payloads with all field combinations
    - Verify all specified fields are correctly extracted and typed
    - **Validates: Requirements 5.2**

  - [x] 7.4 Implement notification processing pipeline
    - Create notification service in src/services/notification/service.ts
    - On notification received: parse → persist to database → emit event on event bus
    - Emit "notification:received" for downstream Rule_Engine and Analytics_Service
    - Ensure pipeline completes within 100ms target
    - _Requirements: 5.3, 5.4_

- [x] 8. Checkpoint - Core notification pipeline complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. AI Classification Engine
  - [x] 9.1 Implement keyword-based classifier
    - Create AI classifier in src/features/ai/engine/classifier.ts implementing IAIClassifier interface
    - Implement classify() method using keyword matching against notification title, content, sender
    - Implement keyword dictionary storage and retrieval via settings repository
    - Ensure classifier always returns exactly one valid category with confidence score
    - Seed default keyword dictionary (e.g., "urgent"→Important, "sale"→Promotion, "meeting"→Work)
    - _Requirements: 13.1, 13.2_


  - [x]* 9.2 Write property tests for AI classifier
    - **Property 14: AI Classification Produces Valid Category**
    - Generate arbitrary notification content (empty, whitespace, special chars, long strings)
    - Verify classifier always returns one valid category, never null/undefined
    - **Validates: Requirements 13.1**

  - [x]* 9.3 Write property test for keyword dictionary round-trip
    - **Property 15: Keyword Dictionary Update Round-Trip**
    - Generate arbitrary keyword dictionary updates (add, remove, replace)
    - Verify reading back reflects exact changes with no unintended modifications
    - **Validates: Requirements 13.2**

  - [x] 9.4 Integrate AI classifier into notification pipeline
    - Subscribe to "notification:parsed" event on event bus
    - Classify notification and store prediction in ai_predictions table
    - Update notification category field with classification result
    - Emit "notification:classified" event for downstream processing
    - _Requirements: 5.5, 13.4_

  - [x] 9.5 Implement AI insights screen
    - Create AIInsightsScreen in src/features/ai/screens/
    - Display classification accuracy summary (category distribution)
    - Display pattern recommendations based on keyword matches
    - Display automation suggestions based on frequent patterns
    - _Requirements: 13.3_

- [x] 10. Rule Engine Core
  - [x] 10.1 Implement trigger handlers
    - Create trigger registry in src/features/rules/engine/triggers/
    - Implement trigger handlers for: App (match packageName), Keyword (match content/title), Contact (match sender), Time (match time window), Location (placeholder), Frequency (count-based)
    - Each handler implements TriggerHandler interface with evaluate(notification, config) method
    - _Requirements: 8.1_


  - [x] 10.2 Implement condition evaluators
    - Create condition registry in src/features/rules/engine/conditions/
    - Implement evaluators for: Contains, Not Contains, Regex, Category, Priority, Time Window
    - Implement AND/OR logic operator evaluation respecting orderIndex
    - Each evaluator implements ConditionEvaluator interface
    - _Requirements: 8.2_

  - [x]* 10.3 Write property test for condition boolean logic
    - **Property 8: Condition Logic Boolean Evaluation**
    - Generate arbitrary condition sets with AND/OR operators
    - Verify AND requires all true, OR requires at least one true
    - Verify evaluation respects orderIndex sequence
    - **Validates: Requirements 9.3**

  - [x] 10.4 Implement action executors
    - Create action registry in src/features/rules/engine/actions/
    - Implement executors for: Dismiss, Delay, Alarm, Vibrate, Reply, Launch App, Batch, Webhook, Copy, Speak
    - Each executor implements ActionExecutor interface with execute(notification, config) method
    - Implement sequential execution respecting orderIndex
    - _Requirements: 8.3_

  - [x] 10.5 Implement rule evaluation engine
    - Create RuleEngine in src/features/rules/engine/engine.ts implementing IRuleEngine interface
    - Subscribe to "notification:classified" event on event bus
    - Load all active rules, evaluate triggers and conditions against notification
    - Execute matching rule actions in sequence
    - Log execution results (ruleId, notificationId, timestamp, actions, status, duration)
    - Handle action failures: log error, continue remaining actions, mark as 'partial'
    - Target: complete evaluation within 50ms
    - _Requirements: 8.4, 8.5, 8.6, 8.7_


  - [x]* 10.6 Write property tests for rule engine
    - **Property 5: Rule Evaluation Executes Matching Actions in Sequence**
    - Generate arbitrary notifications and active rules
    - Verify matching rules execute actions in orderIndex sequence and log results
    - **Validates: Requirements 8.5**

  - [x]* 10.7 Write property test for failed action continuation
    - **Property 6: Failed Action Does Not Block Remaining Actions**
    - Generate rules with multiple actions where one fails
    - Verify subsequent actions still execute and status is 'partial'
    - **Validates: Requirements 8.6**

  - [x]* 10.8 Write property test for execution history completeness
    - **Property 7: Rule Execution History Completeness**
    - Generate arbitrary rule executions
    - Verify persisted record contains all required fields: ruleId, notificationId, timestamp, actions list, status, durationMs
    - **Validates: Requirements 8.7**

- [x] 11. Checkpoint - Rule engine and AI classification complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Rule Builder UI
  - [x] 12.1 Implement rule builder wizard modal
    - Create RuleBuilderModal in src/features/rules/screens/ with 4-step wizard: Select Trigger, Add Conditions, Add Actions, Review
    - Implement step navigation with progress indicator
    - Implement form state management with Zustand store
    - _Requirements: 9.1_

  - [x] 12.2 Implement trigger selection step
    - Create TriggerStep component displaying available trigger types with descriptions
    - Implement configuration forms for each trigger type (app picker, keyword input, contact selector, time picker, frequency config)
    - _Requirements: 9.2_


  - [x] 12.3 Implement conditions and actions steps
    - Create ConditionsStep component allowing multiple conditions with AND/OR toggle
    - Create ActionsStep component with categorized action types and configuration forms
    - Implement add/remove/reorder for both conditions and actions
    - _Requirements: 9.3, 9.4_

  - [x] 12.4 Implement review step and rule persistence
    - Create ReviewStep component displaying natural language rule summary
    - Generate summary text (e.g., "When I get a notification from any app that contains 'urgent' at any time, sound an alarm")
    - Implement validation of all fields before save
    - Persist validated rule to database via RuleRepository
    - _Requirements: 9.5, 9.6_

  - [x]* 12.5 Write property test for rule validation
    - **Property 9: Rule Validation Accepts Valid and Rejects Invalid**
    - Generate arbitrary valid rule configs (non-empty name, valid trigger, at least one action)
    - Generate arbitrary invalid configs (missing fields, invalid values)
    - Verify valid configs persist, invalid configs reject without persisting
    - **Validates: Requirements 9.6**

  - [x] 12.6 Implement rule list and detail screens
    - Create RuleListScreen showing all rules with active/inactive toggle
    - Create RuleDetailScreen showing rule configuration, execution history, and stats
    - Implement rule enable/disable, edit, and delete actions
    - _Requirements: 8.5, 9.1_

- [x] 13. Accessibility Automation
  - [x] 13.1 Create accessibility service native module
    - Create Android AccessibilityService native module in src/native/accessibility/
    - Implement IAccessibilityBridge interface: isEnabled(), dismissNotification(), clickAction(), expandNotification(), autoReply()
    - Bridge native accessibility events to React Native
    - _Requirements: 10.1, 10.2_


  - [x] 13.2 Integrate accessibility actions with rule engine
    - Wire accessibility action executors (dismiss, click, expand, reply) to use IAccessibilityBridge
    - Implement retry logic: up to 3 retries with exponential backoff (100ms, 400ms, 1600ms)
    - Log accessibility action events: action type, target notification, success/failure, timestamp, retry count
    - _Requirements: 10.2, 10.3, 10.4_

- [x] 14. Dashboard
  - [x] 14.1 Implement dashboard header and analytics cards
    - Create DashboardScreen in src/features/dashboard/screens/
    - Implement header with user avatar, time-based greeting, search button, notification bell
    - Implement analytics stat cards: Notifications Today, Rules Triggered, Focus Time, Productivity Score, Focus Score
    - Wire cards to analytics service queries via TanStack Query
    - _Requirements: 6.1, 6.2_

  - [x] 14.2 Implement dashboard charts and activity feed
    - Implement Notification Trend line chart using chart library
    - Implement Top Apps bar/pie chart
    - Implement Focus Trend line chart
    - Create Recent Activity feed component showing: Rule Activity, Notification Activity, Focus Sessions ordered by recency
    - Implement empty states for sections with no data
    - _Requirements: 6.3, 6.4, 6.5_

- [x] 15. Notification History and Details
  - [x] 15.1 Implement notification list screen
    - Create NotificationListScreen in src/features/notifications/screens/
    - Implement paginated FlatList/FlashList with NotificationCard organisms
    - Implement search bar with debounced query matching title, content, sender, app name
    - Implement filter controls: category, app, date range, priority, read status
    - Implement sort options: date, priority, app
    - _Requirements: 7.1, 7.2, 7.5_


  - [x]* 15.2 Write property tests for notification filtering and search
    - **Property 3: Notification Filtering Correctness**
    - Generate arbitrary notification sets and filter combinations
    - Verify all returned notifications satisfy every filter, none excluded incorrectly
    - **Property 4: Notification Search Matches Correct Fields**
    - Generate arbitrary search queries and notification sets
    - Verify results contain query in title/content/sender/appName, no valid matches excluded
    - **Validates: Requirements 7.2, 7.5**

  - [x] 15.3 Implement notification detail screen
    - Create NotificationDetailScreen in src/features/notifications/screens/
    - Display full metadata: app icon, app name, timestamp, priority, category
    - Display full content: title, body, sender
    - Display AI classification result with confidence and matched keywords
    - Display matched rules and execution history for this notification
    - Implement actions: Delete, Archive, Restore, Share, Export
    - _Requirements: 7.3, 7.4_

- [x] 16. Checkpoint - UI features complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Focus Mode
  - [x] 17.1 Implement focus engine
    - Create FocusEngine in src/features/focus/engine/ implementing IFocusEngine interface
    - Implement startSession() with preset selection: Study, Work, Sleep, Meeting, Custom
    - Implement pauseSession(), resumeSession(), endSession() with state machine validation
    - Implement isBlocked(packageName) checking against session whitelist/blacklist
    - Persist session records with duration, preset, blocked count, interruptions
    - _Requirements: 11.1, 11.3, 11.4_


  - [x]* 17.2 Write property tests for focus engine
    - **Property 10: Focus Session State Machine Transitions**
    - Generate arbitrary session states and transition attempts
    - Verify only valid transitions succeed (active→paused, active→completed/cancelled, paused→active, paused→completed/cancelled)
    - Verify invalid transitions are rejected without state modification
    - **Property 11: Focus Mode Notification Blocking**
    - Generate arbitrary active sessions with blocked/allowed app lists and incoming notifications
    - Verify blocked app notifications are suppressed, non-blocked pass through
    - **Validates: Requirements 11.2, 11.4**

  - [x] 17.3 Integrate focus engine with notification pipeline
    - Subscribe to "notification:received" event in focus engine
    - Check isBlocked() before allowing notification through pipeline
    - Increment blockedCount and interruptionCount on session record
    - Emit "focus:notification_blocked" event for analytics
    - _Requirements: 11.2_

  - [x] 17.4 Implement focus mode UI
    - Create FocusModeModal in src/features/focus/screens/ with preset selection
    - Implement active session display: timer, pause/resume/end controls, blocked count
    - Implement app whitelist/blacklist management screen with installed app picker
    - Implement optional time-based schedule configuration
    - _Requirements: 11.1, 11.4, 11.5_

- [x] 18. Analytics
  - [x] 18.1 Implement analytics aggregation service
    - Create AnalyticsService in src/services/analytics/ implementing IAnalyticsService interface
    - Implement getMetrics(period): calculate total notifications, focus score, distraction score, productivity score
    - Implement getNotificationTrend(period): aggregate notification counts by time bucket
    - Implement getTopApps(period, limit): rank apps by notification count
    - Implement getProductivityScore() and getFocusScore() calculation formulas
    - Implement incrementalUpdate(event): update pre-aggregated analytics table on new events
    - _Requirements: 12.1, 12.4, 12.5_


  - [x]* 18.2 Write property tests for analytics
    - **Property 12: Analytics Aggregation Time-Boundary Correctness**
    - Generate arbitrary time periods and notification records
    - Verify only records within period boundaries are counted (inclusive start, exclusive end)
    - **Property 13: Analytics Incremental Update Consistency**
    - Generate arbitrary event sequences
    - Verify incremental results match full recalculation, and duplicate events don't double-count
    - **Validates: Requirements 12.4, 12.5**

  - [x] 18.3 Implement analytics screens
    - Create AnalyticsHomeScreen in src/features/analytics/screens/
    - Implement time period tabs: Daily, Weekly, Monthly, Yearly
    - Implement bar chart for notification volume
    - Implement pie chart for category distribution
    - Implement line chart for trends over time
    - Implement heatmap for activity patterns (hour × day)
    - Wire all charts to AnalyticsService via TanStack Query
    - _Requirements: 12.2, 12.3_

  - [x] 18.4 Wire analytics to event bus
    - Subscribe to "notification:classified", "rule:executed", "focus:session_ended" events
    - Call incrementalUpdate() on each relevant event
    - Invalidate analytics TanStack Query cache on updates
    - _Requirements: 12.5_

- [x] 19. Checkpoint - Analytics and focus mode complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Settings and Backup
  - [x] 20.1 Implement settings screens
    - Create SettingsHomeScreen in src/features/settings/screens/ with sections: General, Notifications, Automation, Analytics, Privacy, About
    - Implement General section: theme toggle (dark active, light disabled), language
    - Implement Notifications section: notification preferences, sound, vibration
    - Implement Automation section: rule engine toggle, max rules
    - Implement Analytics section: data retention period, export frequency
    - Implement Privacy section: data collection toggles
    - Implement About section: version, licenses, support links
    - _Requirements: 14.1, 14.2_


  - [x] 20.2 Implement backup export/import service
    - Create backup service in src/services/backup/
    - Implement exportDatabase(): serialize all tables to JSON, write to file system
    - Implement importDatabase(file): validate file structure, wrap in transaction, restore all tables
    - On import failure (corrupted, invalid schema, wrong version): rollback transaction, display error, leave database unchanged
    - _Requirements: 14.3, 14.4, 14.5_

  - [x]* 20.3 Write property tests for backup
    - **Property 16: Export/Import Database Round-Trip**
    - Generate arbitrary database states with notifications, rules, sessions, analytics, settings
    - Verify export → import into fresh DB produces equivalent state
    - **Property 17: Invalid Import Leaves Database Unchanged**
    - Generate arbitrary corrupted/malformed backup files
    - Verify import fails gracefully and database state is unchanged
    - **Validates: Requirements 14.3, 14.4, 14.5**

- [x] 21. Performance Optimization and Integration Wiring
  - [x] 21.1 Optimize notification pipeline performance
    - Profile notification processing pipeline end-to-end
    - Ensure parse + store + emit completes within 100ms
    - Ensure rule evaluation completes within 50ms for up to 100 active rules
    - Implement FlashList for notification history with 60fps target
    - Optimize database queries with proper index usage
    - _Requirements: 15.5, 15.6, 15.7_

  - [x] 21.2 Wire all features together via event bus
    - Verify event flow: notification:received → notification:parsed → notification:classified → rule evaluation → rule:executed → analytics update
    - Verify focus mode integration blocks notifications before rule evaluation
    - Verify TanStack Query cache invalidation on all relevant events
    - Ensure app launch reaches interactive state within 2 seconds
    - _Requirements: 15.4, 15.7_

- [x] 22. Final Checkpoint - All features integrated
  - Ensure all tests pass, ask the user if questions arise.


## Notes

- Tasks marked with `*` are optional property-based test tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints (tasks 4, 8, 11, 16, 19, 22) ensure incremental validation between phases
- Property tests use fast-check library with custom arbitraries as defined in the design
- The project uses TypeScript throughout with strict mode enabled
- All UI components use NativeWind (Tailwind CSS) with the dark theme tokens
- State management: Zustand for client state, TanStack Query for database/async state
- Cross-feature communication uses the event bus pattern exclusively
- Native modules (NotificationListenerService, AccessibilityService) require expo-dev-client build

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "3.2"] },
    { "id": 4, "tasks": ["2.3", "3.3"] },
    { "id": 5, "tasks": ["2.4", "3.4", "3.5"] },
    { "id": 6, "tasks": ["5.1", "5.2"] },
    { "id": 7, "tasks": ["6.1", "6.2", "7.1"] },
    { "id": 8, "tasks": ["7.2"] },
    { "id": 9, "tasks": ["7.3", "7.4"] },
    { "id": 10, "tasks": ["9.1"] },
    { "id": 11, "tasks": ["9.2", "9.3", "9.4"] },
    { "id": 12, "tasks": ["9.5", "10.1", "10.2"] },
    { "id": 13, "tasks": ["10.3", "10.4"] },
    { "id": 14, "tasks": ["10.5"] },
    { "id": 15, "tasks": ["10.6", "10.7", "10.8", "12.1"] },
    { "id": 16, "tasks": ["12.2", "12.3", "13.1"] },
    { "id": 17, "tasks": ["12.4", "12.5", "12.6", "13.2"] },
    { "id": 18, "tasks": ["14.1", "15.1", "17.1"] },
    { "id": 19, "tasks": ["14.2", "15.2", "15.3", "17.2"] },
    { "id": 20, "tasks": ["17.3", "17.4"] },
    { "id": 21, "tasks": ["18.1"] },
    { "id": 22, "tasks": ["18.2", "18.3", "18.4"] },
    { "id": 23, "tasks": ["20.1", "20.2"] },
    { "id": 24, "tasks": ["20.3"] },
    { "id": 25, "tasks": ["21.1", "21.2"] }
  ]
}
```
