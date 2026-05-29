# Bugfix Requirements Document

## Introduction

Expo Router is incorrectly discovering non-route files located in `/src/app/`, causing Jest test files and provider components to be loaded as routes during the file-based routing discovery process. This results in navigator initialization errors (e.g., `ReferenceError: Property 'jest' doesn't exist`) and route discovery warnings. The root `/app/` directory is correctly configured with 6 actual routes, but non-route files in `/src/app/` create additional problematic route entries. The fix relocates all non-route files to their proper locations outside the Expo Router discovery path, allowing only true route components to be discovered while maintaining all existing functionality.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the application initializes and Expo Router performs file-based route discovery THEN the system discovers test files (*.test.ts) from `/src/app/` and attempts to load them as route components

1.2 WHEN Expo Router discovers app-init.test.ts THEN the system encounters Jest mock code and throws `ReferenceError: Property 'jest' doesn't exist` because Jest globals are not available in the route loading context

1.3 WHEN Expo Router discovers provider component files in `/src/app/providers/` THEN the system attempts to treat React context providers as screen routes, causing route structure violations and initialization failures

1.4 WHEN app initialization occurs THEN the system logs warnings about unexpected non-route files being discovered during the file-based routing scan

### Expected Behavior (Correct)

2.1 WHEN the application initializes and Expo Router performs file-based route discovery THEN the system discovers ONLY route components from the root `/app/` directory (6 routes: tabs layout, onboarding, rule-builder, focus-mode, and detail screens)

2.2 WHEN Expo Router scans for routes THEN the system does NOT attempt to load test files, service files, or provider components as routes because they are relocated outside the discovery path

2.3 WHEN the application loads service initialization logic from app-init.ts THEN the system imports it from `/src/services/app/` (not from `/src/app/`) so it is never discovered as a route

2.4 WHEN the application loads provider components THEN the system imports them from `/src/providers/` (not from `/src/app/providers/`) so they are never discovered as routes

2.5 WHEN the application runs test files THEN the system loads them from `/src/__tests__/` (not from `/src/app/`) so Jest globals are available and test execution is not affected by route discovery

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the root `/app/` directory is scanned THEN the system SHALL CONTINUE TO discover exactly 6 routes (tabs layout, onboarding, rule-builder, focus-mode, notification detail, rule detail)

3.2 WHEN AppProviders is imported in app/_layout.tsx THEN the system SHALL CONTINUE TO load the root provider component in the correct initialization order (DatabaseProvider → QueryProvider → AppInitProvider)

3.3 WHEN initializeApp() is called from the app init provider THEN the system SHALL CONTINUE TO execute the correct event flow: notification:received → notification:parsed → notification:classified → rule evaluation → rule:executed → analytics update

3.4 WHEN existing tests run with `npm test` THEN the system SHALL CONTINUE TO pass all 459 tests without any changes to test behavior or coverage

3.5 WHEN focus mode integration, classification service, rule engine, and analytics integration are initialized THEN the system SHALL CONTINUE TO wire integrations in the correct order and emit expected event bus events

3.6 WHEN TanStack Query cache invalidation is set up THEN the system SHALL CONTINUE TO invalidate the correct query keys on notification, rule, and focus events

3.7 WHEN the app is deploding configuration changes
