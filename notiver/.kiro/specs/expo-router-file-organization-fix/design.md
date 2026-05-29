# Expo Router File Organization Bugfix - Design Document

## Overview

The Expo Router file-based routing discovery system scans `/app/` and `/src/app/` for route components. Non-route files (test files, service files, provider components) in `/src/app/` are being discovered and loaded as routes, causing Jest mock errors and route structure violations.

This design establishes a systematic file reorganization that relocates non-route files out of the discovery path while preserving all existing functionality and maintaining correct import paths throughout the application.

The fix follows the principle: **only route components belong in directories that Expo Router discovers**.

## Glossary

- **Bug_Condition (C)**: The condition where non-route files (*.test.ts, services, providers) exist in `/src/app/`, causing them to be discovered and loaded as routes during Expo Router initialization
- **Property (P)**: The desired behavior when Expo Router scans for routes—only the 6 true route components from `/app/` are discovered and loaded
- **Preservation**: All existing functionality must continue to work exactly as before—provider initialization order, event bus wiring, cache invalidation, all 459 tests, and all application behavior remain unchanged
- **app-init**: Service file at `/src/app/app-init.ts` containing the `initializeApp()` and `teardownApp()` functions that wire the event-driven pipeline
- **AppProviders**: Root provider component exported from `/src/app/providers/index.tsx` that combines DatabaseProvider, QueryProvider, and AppInitProvider
- **Route Discovery Path**: Directories scanned by Expo Router for route components (currently: `/app/` + `/src/app/`)
- **Non-Route Files**: Test files (*.test.ts), service files (app-init.ts), provider components, configuration, and utilities that should NOT be treated as routes

## Bug Details

### Bug Condition

The bug manifests when the Expo Router file-based discovery system scans the `/src/app/` directory for route components. The system discovers non-route files (test files and service files) and attempts to load them as route components, resulting in multiple failures:

1. **Test File Discovery**: `app-init.test.ts` contains Jest mock code that references the global `jest` object. When Expo Router loads this file, Jest globals are not available in the route loading context, causing `ReferenceError: Property 'jest' doesn't exist`

2. **Service File Discovery**: `app-init.ts` is not a route component but a service module. Expo Router attempts to interpret it as a route, causing route structure violations

3. **Provider Directory Issues**: `/src/app/providers/` contains React context providers, not routes. Expo Router discovers these and attempts to load them as screens, violating the route structure

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input = FileSystemEvent during app initialization
  OUTPUT: boolean
  
  RETURN (input.filePath IN ['/src/app/*.test.ts', '/src/app/app-init.ts', '/src/app/providers/**/*']
         AND input.fileType NOT IN [RouteComponent]
         AND ExpoRouter.fileMatcher(input.filePath) = true
         AND ExpoRouter.attempts_to_load_as_route(input) = true)
END FUNCTION
```

### Examples

1. **Test File Discovery (Current Broken Behavior)**
   - File: `/src/app/app-init.test.ts`
   - What Happens: Expo Router discovers the file during initialization
   - Error: `ReferenceError: Property 'jest' doesn't exist` because Jest globals are not available
   - Expected: File should NOT be discovered during route discovery
   - Root Cause: File is in `/src/app/` which Expo Router scans

2. **Service File as Route (Current Broken Behavior)**
   - File: `/src/app/app-init.ts`
   - What Happens: Expo Router attempts to load it as a route
   - Error: Route structure violation, navigation initialization fails
   - Expected: File should NOT be discovered as a route
   - Root Cause: File is in `/src/app/` which Expo Router scans

3. **Provider Directory Discovery (Current Broken Behavior)**
   - File: `/src/app/providers/app-init-provider.tsx`
   - What Happens: Expo Router discovers and attempts to load as route
   - Error: Provider component loaded as screen causes initialization failure
   - Expected: File should NOT be discovered as a route
   - Root Cause: Directory is under `/src/app/` which Expo Router scans

4. **Correct Route Discovery (Should Continue to Work)**
   - Files: `/app/(tabs)/_layout.tsx`, `/app/onboarding.tsx`, `/app/rule-builder.tsx`, `/app/focus-mode.tsx`, `/app/notification/[id].tsx`, `/app/rule/[id].tsx`
   - What Happens: Expo Router discovers exactly these 6 routes
   - Expected: Exactly these 6 routes are discovered and loaded
   - Root Cause (if this breaks): Our reorganization must not touch `/app/` directory

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The root `/app/` directory SHALL CONTINUE TO contain exactly 6 routes and is not modified by this fix
- The app/_layout.tsx file SHALL CONTINUE TO import AppProviders using the import path (after updating from `@/src/app/providers` to `@/src/providers`)
- The event pipeline initialization order SHALL CONTINUE TO follow: DatabaseProvider → QueryProvider → AppInitProvider → app services
- The notification event flow SHALL CONTINUE TO follow: notification:received → notification:parsed → notification:classified → rule evaluation → rule:executed → analytics update
- TanStack Query cache invalidation SHALL CONTINUE TO work on all relevant event bus events
- All 459 tests SHALL CONTINUE TO pass with no test behavior changes
- Provider component functionality SHALL CONTINUE TO work exactly as before (DatabaseProvider, QueryProvider, AppInitProvider)
- The queryClient instance used in app-init.ts SHALL CONTINUE TO be the same instance exported from query-provider
- Focus mode integration, classification service, rule engine, and analytics integration SHALL CONTINUE TO wire correctly with proper event bus subscriptions

**Scope:**
All imports that reference the moved files must be updated, but the functionality and behavior must remain identical. This is a pure file reorganization with import path updates—no code logic changes, no behavioral changes.

## Hypothesized Root Cause

Based on the bug description and file structure analysis:

1. **Incorrect File Location for Non-Route Files**: The `/src/app/` directory is scanned by Expo Router as a potential route discovery location. Non-route files (services, tests, providers) should not be in this location. They should be moved to directories outside the discovery path while maintaining the same import aliases.

2. **Missing Providers Directory**: The `/src/providers/` directory does not exist yet. Provider components should be moved here, which is not on the route discovery path.

3. **Missing Services Directory**: The `/src/services/app/` directory structure does not exist yet. The app-init service should be moved here to separate application-layer services from route files.

4. **Missing __tests__ Directory**: While `/src/__tests__/` exists, the app-init.test.ts is currently in `/src/app/`, mixing test files with service files. Tests should be centralized in `/src/__tests__/`.

5. **Import Path Updates Required**: After moving files, 5 import statements must be updated:
   - `app/_layout.tsx`: Change `@/src/app/providers` → `@/src/providers`
   - `src/app/providers/app-init-provider.tsx`: Change `@/src/app/app-init` → `@/src/services/app/app-init`
   - `src/app/app-init.ts`: Change `@/src/app/providers/query-provider` → `@/src/providers/query-provider`
   - `src/services/analytics/analytics-event-integration.ts`: Change `@/src/app/providers/query-provider` → `@/src/providers/query-provider`
   - `src/services/analytics/analytics-event-integration.test.ts`: Change `@/src/app/providers/query-provider` → `@/src/providers/query-provider` (in jest.mock)

## Correctness Properties

Property 1: Bug Condition - Non-Route Files Excluded from Discovery

_For any_ file in `/src/app/` that is not a route component (test files, service files, provider files), the fixed directory structure SHALL ensure these files are no longer in any path scanned by Expo Router for route discovery, preventing them from being loaded as routes and eliminating the `ReferenceError: Property 'jest' doesn't exist` and route structure violations.

**Validates: Requirements 1.2, 1.3, 1.4, 2.1, 2.2**

Property 2: Preservation - Route Discovery and Functionality

_For any_ file in `/app/` directory (the 6 true routes), the fixed code SHALL CONTINUE TO be discovered by Expo Router in exactly the same way, producing the exact same 6 route entries (tabs layout, onboarding, rule-builder, focus-mode, notification detail, rule detail), with no changes to route structure, discovery, or loading behavior.

**Validates: Requirements 2.1, 3.1**

Property 3: Preservation - Provider Initialization Order and Wiring

_For any_ initialization of the application, the fixed code SHALL CONTINUE TO execute the provider initialization in the same order (DatabaseProvider → QueryProvider → AppInitProvider) and wire the event bus integrations in the same order (focus integration → classification → rule engine → analytics → cache invalidation → notification service), producing the identical event flow and subscription behavior with no functional differences.

**Validates: Requirements 3.2, 3.3, 3.5**

Property 4: Preservation - Query Client and Cache Invalidation

_For any_ event emitted on the event bus (notification:received, notification:parsed, notification:classified, rule:executed, focus:session:started/ended, focus:session:paused/resumed, focus:notification:blocked), the fixed code SHALL CONTINUE TO invalidate the same query keys using the same queryClient instance, producing identical cache invalidation behavior with no changes to which queries are invalidated.

**Validates: Requirements 3.6**

Property 5: Preservation - Test Execution

_For any_ test file run with `npm test` (all 459 tests), the fixed code SHALL CONTINUE TO execute with Jest globals available, import paths working correctly, and all 459 tests passing without any behavioral changes to tests or test coverage.

**Validates: Requirements 1.1, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, the fix involves creating new directories and moving files, followed by updating import statements in 5 files.

**Phase 1: Create Target Directory Structure**

1. **Create `/src/services/app/` directory**
   - Location: `c:\Users\devda\Documents\notiver\notiver\src\services\app\`
   - Purpose: House application-layer services (currently only app-init.ts)

2. **Create `/src/providers/` directory**
   - Location: `c:\Users\devda\Documents\notiver\notiver\src\providers\`
   - Purpose: House React context providers (currently in src/app/providers/)

**Phase 2: Move Files**

1. **Move app-init.ts**
   - From: `/src/app/app-init.ts`
   - To: `/src/services/app/app-init.ts`
   - No code changes, pure file movement

2. **Move test file**
   - From: `/src/app/app-init.test.ts`
   - To: `/src/__tests__/app-init.test.ts`
   - No code changes, pure file movement

3. **Move provider files**
   - From: `/src/app/providers/*`
   - To: `/src/providers/*`
   - Files: `index.tsx`, `app-init-provider.tsx`, `database-provider.tsx`, `query-provider.tsx`
   - No code changes except import updates within these files

**Phase 3: Update Import Statements**

1. **File: `app/_layout.tsx`**
   - Current: `import { AppProviders } from '@/src/app/providers';`
   - Updated: `import { AppProviders } from '@/src/providers';`
   - Reason: Providers moved to `/src/providers/`

2. **File: `src/providers/app-init-provider.tsx` (moved from `src/app/providers/`)**
   - Current: `import { initializeApp, teardownApp } from '@/src/app/app-init';`
   - Updated: `import { initializeApp, teardownApp } from '@/src/services/app/app-init';`
   - Reason: app-init moved to `/src/services/app/`

3. **File: `src/services/app/app-init.ts` (moved from `src/app/`)**
   - Current: `import { queryClient } from '@/src/app/providers/query-provider';`
   - Updated: `import { queryClient } from '@/src/providers/query-provider';`
   - Reason: Providers moved to `/src/providers/`

4. **File: `src/services/analytics/analytics-event-integration.ts`**
   - Current: `import { queryClient } from '@/src/app/providers/query-provider';`
   - Updated: `import { queryClient } from '@/src/providers/query-provider';`
   - Reason: Providers moved to `/src/providers/`

5. **File: `src/services/analytics/analytics-event-integration.test.ts`**
   - Current: `jest.mock('@/src/app/providers/query-provider', () => ({`
   - Updated: `jest.mock('@/src/providers/query-provider', () => ({`
   - Reason: Providers moved to `/src/providers/`

**Phase 4: Verification**

- Run `npm test` to verify all 459 tests pass
- Run `npm run build` to verify TypeScript compilation succeeds
- Manual verification: Start the dev server and check that:
  - Exactly 6 routes are discovered by Expo Router
  - No Jest error about missing 'jest' property
  - No route structure violations or initialization errors
  - App initializes correctly with all provider functionality intact

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples demonstrating the bug on unfixed code by examining current Expo Router behavior and import structure, then verify the fix works correctly and preserves existing behavior through both code analysis and test execution.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Examine current import structure and Expo Router configuration to identify:
1. Which files are currently in `/src/app/` that should not be discovered as routes
2. Verify that test files contain Jest references that would fail if loaded by Expo Router
3. Confirm that Expo Router's default file-based routing discovers files in `/src/app/`
4. Verify that the current setup causes the described errors

**Current State Observations**:
1. **Test File Discovery**: `/src/app/app-init.test.ts` contains `jest.mock()` calls, which will fail if Jest globals are not available
2. **Expo Router Configuration**: `metro.config.js` uses the default Expo configuration which includes `/src/app/` in route discovery
3. **Import Structure**: 5 files import from `/src/app/` or `/src/app/providers/`, confirming the dependency graph

**Expected Counterexamples** (bugs demonstrated by current unfixed code):
- Expo Router discovers non-route files in `/src/app/`
- Jest mock code in test files cannot be loaded by Expo Router route discovery
- Route structure violations occur when provider files are treated as routes
- Navigation initialization fails due to incorrect route structure

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (non-route files in discovery paths), the fixed code prevents them from being discovered as routes.

**Pseudocode:**
```
FOR ALL file IN ['/src/app/app-init.ts', '/src/app/app-init.test.ts', '/src/app/providers/**/*'] DO
  ASSERT ExpoRouter.fileMatcher(movedFile.path) = false
         OR movedFile.path NOT IN ['/app/', '/src/app/']
  ASSERT file can_no_longer_be_discovered_as_route
END FOR
```

**Verification Method**:
- Verify that files have been moved out of `/src/app/`
- Verify that `/src/app/` directory no longer exists (or is empty)
- Verify that moved files exist in their new locations:
  - `/src/services/app/app-init.ts`
  - `/src/__tests__/app-init.test.ts`
  - `/src/providers/*` (all provider files)
- Verify through file system inspection that Expo Router cannot discover these files from their new locations

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (the 6 true route files in `/app/`), the fixed code continues to work exactly as before.

**Pseudocode:**
```
FOR ALL input WHERE input IN ['/app/(tabs)/_layout.tsx', '/app/onboarding.tsx', '/app/rule-builder.tsx', 
                               '/app/focus-mode.tsx', '/app/notification/[id].tsx', '/app/rule/[id].tsx'] DO
  ASSERT ExpoRouter.routes_discovered_fixed = ExpoRouter.routes_discovered_original
         AND ExpoRouter.route_structure_fixed = ExpoRouter.route_structure_original
  ASSERT initializeApp_fixed() === initializeApp_original()
         AND teardownApp_fixed() === teardownApp_original()
  ASSERT queryClient_fixed === queryClient_original
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test case scenarios automatically
- It catches edge cases in provider initialization order
- It provides strong guarantees that event bus wiring remains unchanged
- It verifies that all 459 tests continue to pass with identical behavior

**Test Plan**:
1. Run existing test suite (`npm test`) and verify all 459 tests pass
2. Verify import paths are correctly updated in all 5 files through code inspection
3. Verify TypeScript compilation succeeds with updated imports
4. Manually verify app initialization by:
   - Checking that providers are initialized in correct order (DatabaseProvider → QueryProvider → AppInitProvider)
   - Verifying that event bus wiring is unchanged (focus → classification → rules → analytics → cache → notification)
   - Confirming that no 'jest' global errors occur
   - Confirming that exactly 6 routes are discovered

### Unit Tests

- Verify that `initializeApp()` function works identically when imported from `/src/services/app/app-init.ts`
- Verify that `AppProviders` component works identically when imported from `/src/providers/`
- Verify that `queryClient` instance is identical whether used from moved location or original
- Verify that all provider components (DatabaseProvider, QueryProvider, AppInitProvider) are accessible from new locations

### Property-Based Tests

- Generate random event sequences and verify cache invalidation works identically with moved queryClient
- Generate random app initialization scenarios and verify provider order is preserved
- Test that all event bus integrations wire correctly with moved app-init service
- Verify that all 459 existing tests pass with moved imports

### Integration Tests

- Full app flow: Initialize app with moved providers and verify complete event pipeline works
- Route discovery: Start dev server and verify exactly 6 routes are discovered (no test files or providers as routes)
- Provider initialization: Verify DatabaseProvider, QueryProvider, AppInitProvider all initialize successfully and in correct order
- Event flow: Emit events through event bus and verify cache invalidation works with moved queryClient
- Test execution: Run full test suite with moved test file and verify all 459 tests pass

