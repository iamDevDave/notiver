# Expo Router File Organization Fix

# Implementation Plan

This implementation plan reorganizes files to prevent Expo Router from discovering non-route files (test files, service files, provider components) as routes. The fix follows the bug condition methodology to:

1. **Explore** - Verify the bug condition through file system inspection and route discovery analysis
2. **Preserve** - Confirm existing route discovery and app functionality remain unchanged
3. **Implement** - Execute file moves and import updates
4. **Validate** - Verify all tests pass and no regressions occur

---

## Overview

This spec addresses the bug where Expo Router discovers non-route files (test files, service files, provider components) in the `/src/app/` directory and attempts to load them as routes. This causes initialization failures and Jest errors. The fix reorganizes the file structure to move non-route files to appropriate locations outside the router discovery path.

---

## Tasks

**Phase 1: Bug Condition Exploration (1 task)**
- Analyze current file organization and route discovery to surface evidence of the bug

**Phase 2: Preservation Requirements Documentation (1 task)**
- Document existing behavior that must be preserved (6 routes, provider initialization, event bus wiring)

**Phase 3: Directory Structure Setup (2 tasks)**
- Create `/src/services/app/` and `/src/providers/` target directories

**Phase 4: File Movement (4 tasks)**
- Move app-init.ts to services, app-init.test.ts to __tests__, and 4 provider files to /src/providers/

**Phase 5: Import Path Updates (5 tasks)**
- Update 5 import statements across 5 files to reference new file locations

**Phase 6: Verification & Testing (5 tasks)**
- Verify TypeScript compilation, run tests, verify route discovery, app initialization, and checkpoint all success criteria

**Total: 18 Tasks**

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": [1],
      "description": "Phase 1: Bug Condition Analysis - Analyze current file organization and route discovery"
    },
    {
      "wave": 2,
      "tasks": [2],
      "description": "Phase 2: Preservation Documentation - Document existing behavior that must be preserved",
      "dependsOn": [1]
    },
    {
      "wave": 3,
      "tasks": [3.1, 3.2],
      "description": "Phase 3: Directory Setup - Create target directories for services and providers",
      "dependsOn": [2]
    },
    {
      "wave": 4,
      "tasks": [4, 5, 6.1, 6.2, 6.3, 6.4, 7],
      "description": "Phase 4: File Movement - Move files to new locations (can execute in parallel)",
      "dependsOn": [3.1, 3.2]
    },
    {
      "wave": 5,
      "tasks": [8, 9, 10, 11, 12],
      "description": "Phase 5: Import Updates - Update import paths across 5 files (can execute in parallel)",
      "dependsOn": [4]
    },
    {
      "wave": 6,
      "tasks": [13, 14, 15, 16, 17, 18],
      "description": "Phase 6: Verification & Testing - Verify compilation, tests, route discovery, and app initialization",
      "dependsOn": [5]
    }
  ]
}
```

---

## Phase 1: Bug Condition Exploration

- [x] 1. Analyze current file organization and route discovery
  - **Property 1: Bug Condition** - Non-Route Files in Discovery Path
  - **GOAL**: Surface evidence that non-route files are currently discoverable by Expo Router
  - **ANALYSIS SCOPE**:
    - Examine files currently in `/src/app/`: identify test files (*.test.ts), service files (app-init.ts), and provider files
    - Verify these files contain code that would fail if loaded as routes (Jest mocks, context provider code, service logic)
    - Confirm `/src/app/` is scanned by Expo Router based on default file-based routing configuration
    - List affected files:
      - `/src/app/app-init.test.ts` - Contains `jest.mock()` calls that reference Jest globals
      - `/src/app/app-init.ts` - Service file with initialization logic, not a route component
      - `/src/app/providers/app-init-provider.tsx` - React context provider, not a route component
      - `/src/app/providers/database-provider.tsx` - React context provider, not a route component
      - `/src/app/providers/query-provider.tsx` - React context provider with TanStack Query setup, not a route component
      - `/src/app/providers/index.tsx` - Provider aggregator, not a route component
  - **BUG CONDITION SPECIFICATION** (from design: isBugCondition pseudocode):
    - Input: FileSystemEvent for files in `/src/app/` during app initialization
    - Bug manifests when: file is NOT a route component AND Expo Router's fileMatcher discovers it AND system attempts to load as route
    - Result: Jest errors (missing 'jest' global), route structure violations, initialization failures
  - **CURRENT STATE VERIFICATION**:
    - Verify `/src/app/` exists and contains files that should not be routes
    - Confirm these files are in Expo Router's discovery path (not explicitly excluded)
    - Document import paths that currently reference these files (to be updated in Phase 3)
  - **DOCUMENT**: File locations, current import references, and evidence of route discovery scope
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

---

## Phase 2: Preservation Requirements Documentation

- [x] 2. Document existing behavior to preserve
  - **Property 2: Preservation** - Route Discovery and App Functionality
  - **GOAL**: Establish baseline of what MUST continue working identically after the fix
  - **SCOPE OF PRESERVATION**:
    1. **Route Discovery**:
       - Exactly 6 routes currently discovered: `(tabs)/_layout.tsx`, `onboarding.tsx`, `rule-builder.tsx`, `focus-mode.tsx`, `notification/[id].tsx`, `rule/[id].tsx`
       - Route structure: tabs group with 5 nested routes + root level routes
       - All routes import from `/app/` (root Expo Router entry point)
    2. **Provider Initialization**:
       - Current order: DatabaseProvider → QueryProvider → AppInitProvider
       - These providers are initialized via AppProviders component from `/src/app/providers/index.tsx`
       - app/_layout.tsx imports: `import { AppProviders } from '@/src/app/providers';`
    3. **Event Bus Wiring**:
       - initializeApp() from `/src/app/app-init.ts` creates subscriptions in this order:
         - Focus mode integration
         - Classification service
         - Rule engine
         - Analytics integration
         - Query cache invalidation
         - Notification service
       - Event flow: notification:received → notification:parsed → notification:classified → rule evaluation → rule:executed → analytics update
    4. **Import Dependencies**:
       - app/_layout.tsx imports from `@/src/app/providers`
       - app-init-provider.tsx imports from `@/src/app/app-init`
       - app-init.ts imports from `@/src/app/providers/query-provider`
       - analytics-event-integration.ts imports from `@/src/app/providers/query-provider`
       - analytics-event-integration.test.ts has jest.mock for `@/src/app/providers/query-provider`
    5. **Test Execution**:
       - All 459 tests must continue to pass
       - Test files in `/src/app/` and `/src/__tests__/` must have Jest globals available
    6. **Provider Component Functionality**:
       - DatabaseProvider: Creates and provides database connection
       - QueryProvider: Sets up TanStack Query with specific cache configuration
       - AppInitProvider: Calls initializeApp() on mount, teardownApp() on unmount
       - queryClient instance must be identical for cache invalidation to work
  - **VERIFICATION CHECKLIST**:
    - [x] Verify current route count (should be 6)
    - [x] List all current imports from `/src/app/` and `/src/app/providers/`
    - [x] Document provider initialization order
    - [x] Verify test suite passes before changes (baseline: 459 tests passing)
    - [x] Document event bus subscription order from initializeApp()
    - [x] Verify queryClient is used consistently for cache invalidation
  - **DOCUMENT**: Baseline state to verify against after implementation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

---

## Phase 3: Directory Structure Setup

- [x] 3. Create target directory structure
  - [x] 3.1 Create `/src/services/app/` directory
    - Path: `c:\Users\devda\Documents\notiver\notiver\src\services\app\`
    - Purpose: House application-layer services (app-init.ts)
    - Verify directory is empty and ready for files
  - [x] 3.2 Create `/src/providers/` directory
    - Path: `c:\Users\devda\Documents\notiver\notiver\src\providers\`
    - Purpose: House React context providers moved from `/src/app/providers/`
    - Verify directory is empty and ready for files
  - _Requirements: 2.2, 2.3, 2.4_

---

## Phase 4: File Movement

- [x] 4. Move app-init.ts to services
  - Source: `/src/app/app-init.ts`
  - Destination: `/src/services/app/app-init.ts`
  - Action: Move file (no code changes at this point)
  - Verify: Source file no longer exists, destination file exists with identical content
  - _Requirements: 2.3_

- [x] 5. Move test file to __tests__
  - Source: `/src/app/app-init.test.ts`
  - Destination: `/src/__tests__/app-init.test.ts`
  - Action: Move file (no code changes at this point)
  - Verify: Source file no longer exists, destination file exists with identical content
  - Note: File must have Jest globals available in new location (/src/__tests__/ is configured for Jest)
  - _Requirements: 2.5_

- [x] 6. Move provider files to /src/providers/
  - [x] 6.1 Move app-init-provider.tsx
    - Source: `/src/app/providers/app-init-provider.tsx`
    - Destination: `/src/providers/app-init-provider.tsx`
    - Verify: Source no longer exists, destination exists
  - [x] 6.2 Move database-provider.tsx
    - Source: `/src/app/providers/database-provider.tsx`
    - Destination: `/src/providers/database-provider.tsx`
    - Verify: Source no longer exists, destination exists
  - [x] 6.3 Move query-provider.tsx
    - Source: `/src/app/providers/query-provider.tsx`
    - Destination: `/src/providers/query-provider.tsx`
    - Verify: Source no longer exists, destination exists
  - [x] 6.4 Move provider index file
    - Source: `/src/app/providers/index.tsx`
    - Destination: `/src/providers/index.tsx`
    - Verify: Source no longer exists, destination exists
  - _Requirements: 2.4_

- [x] 7. Verify /src/app/ directory is now empty
  - Check that `/src/app/` directory exists but contains no files (except possibly .gitkeep)
  - Note: Do NOT delete the directory itself (Expo Router entry points may still reference it)
  - Verify: Directory is empty or nearly empty
  - _Requirements: 2.1, 2.2_

---

## Phase 5: Import Path Updates

- [x] 8. Update imports in app/_layout.tsx
  - File: `app/_layout.tsx`
  - Current import: `import { AppProviders } from '@/src/app/providers';`
  - Updated import: `import { AppProviders } from '@/src/providers';`
  - Reason: AppProviders now located in `/src/providers/index.tsx`
  - _Requirements: 2.2, 2.4_

- [x] 9. Update imports in app-init-provider.tsx (now in /src/providers/)
  - File: `/src/providers/app-init-provider.tsx` (moved from `/src/app/providers/`)
  - Current import: `import { initializeApp, teardownApp } from '@/src/app/app-init';`
  - Updated import: `import { initializeApp, teardownApp } from '@/src/services/app/app-init';`
  - Reason: app-init service now located in `/src/services/app/app-init.ts`
  - _Requirements: 2.3_

- [x] 10. Update imports in app-init.ts (now in /src/services/app/)
  - File: `/src/services/app/app-init.ts` (moved from `/src/app/`)
  - Current import: `import { queryClient } from '@/src/app/providers/query-provider';`
  - Updated import: `import { queryClient } from '@/src/providers/query-provider';`
  - Reason: queryClient provider now located in `/src/providers/query-provider.tsx`
  - _Requirements: 2.2, 2.4_

- [x] 11. Update imports in analytics-event-integration.ts
  - File: `/src/services/analytics/analytics-event-integration.ts`
  - Current import: `import { queryClient } from '@/src/app/providers/query-provider';`
  - Updated import: `import { queryClient } from '@/src/providers/query-provider';`
  - Reason: queryClient provider now located in `/src/providers/query-provider.tsx`
  - _Requirements: 2.2, 2.4_

- [x] 12. Update jest.mock import in analytics-event-integration.test.ts
  - File: `/src/services/analytics/analytics-event-integration.test.ts`
  - Current mock: `jest.mock('@/src/app/providers/query-provider', () => ({`
  - Updated mock: `jest.mock('@/src/providers/query-provider', () => ({`
  - Reason: queryClient provider now located in `/src/providers/query-provider.tsx`
  - _Requirements: 2.2, 2.4_

---

## Phase 6: Verification & Testing

- [x] 13. Verify TypeScript compilation
  - Command: `npm run build`
  - Expected: No TypeScript errors or warnings
  - Verify: All import paths resolved correctly, no type errors
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 14. Run test suite
  - Command: `npm test -- --run` (single run, not watch mode)
  - Expected: All 459 tests pass
  - Verify:
    - No "jest is not defined" errors (confirms Jest globals available for moved test file)
    - No import resolution errors
    - All test assertions pass
  - _Requirements: 3.4_

- [x] 15. Verify route discovery
  - Method: Start dev server manually or inspect Expo Router configuration
  - Expected: Exactly 6 routes discovered
  - Verify:
    - `(tabs)` group with nested routes
    - `onboarding` route
    - `rule-builder` route
    - `focus-mode` route
    - `notification/[id]` route
    - `rule/[id]` route
    - No routes from moved files (app-init.ts, app-init-provider.tsx, etc.)
  - _Requirements: 2.1, 3.1_

- [x] 16. Verify app initialization flow
  - Method: Manual testing in dev environment or code inspection
  - Verify:
    - DatabaseProvider initializes first
    - QueryProvider initializes second
    - AppInitProvider initializes third and calls initializeApp()
    - initializeApp() creates event bus subscriptions in correct order:
      1. Focus mode integration
      2. Classification service
      3. Rule engine
      4. Analytics integration
      5. Query cache invalidation
      6. Notification service
    - No errors in initialization logs
    - App loads successfully with all providers active
  - _Requirements: 3.2, 3.3, 3.5_

- [x] 17. Verify no Jest errors in app initialization
  - Method: Check console/logs during app startup
  - Verify:
    - No `ReferenceError: Property 'jest' doesn't exist` errors
    - No route discovery warnings
    - No initialization failures related to non-route files being loaded
  - _Requirements: 1.2, 3.4_

---

## Verification Checkpoint

- [x] 18. Checkpoint - Confirm all success criteria met
  - [x] 18.1 All 459 tests pass without errors
    - Verify: `npm test` output shows "459 passed"
  - [x] 18.2 TypeScript compilation succeeds
    - Verify: `npm run build` completes without errors
  - [x] 18.3 Exactly 6 routes discovered by Expo Router
    - Verify: Dev server logs show 6 routes, not 10+
  - [x] 18.4 No Jest global errors during app initialization
    - Verify: No "jest is not defined" or similar errors in logs
  - [x] 18.5 App initializes successfully
    - Verify: App launches and providers initialize in correct order
  - [x] 18.6 No route structure violations
    - Verify: No errors about unexpected route components
  - [x] 18.7 Provider initialization order preserved
    - Verify: Database → Query → AppInit initialization sequence confirmed
  - [x] 18.8 Event bus wiring unchanged
    - Verify: All integrations (focus, classification, rules, analytics) initialize in correct order
  - [x] 18.9 All imports updated correctly
    - Verify: All 5 import statements in Phase 5 are updated and resolving
  - [x] 18.10 Non-route files no longer discoverable
    - Verify: `/src/app/` contains no test files, service files, or provider components
  - **MARK COMPLETE WHEN**: All 10 sub-items verified successfully
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

---

## Notes

**Important Execution Guidelines:**

1. **Sequential Execution**: Complete all tasks in the order presented. Each phase builds on the previous one.

2. **File Movement Strategy**: When moving files, use tools that automatically update import references to prevent breaking changes. This ensures all dependent code is updated together.

3. **Testing Throughout**: Run tests after Phase 5 (before Phase 6 verification) to catch import errors early. Do not wait until the final checkpoint.

4. **Directory Cleanup**: Phase 7 verifies that `/src/app/` is empty after file movement. The directory itself should remain (Expo Router may reference it), but all files should be moved out.

5. **Route Discovery Verification**: The critical success criterion is exactly 6 routes being discovered by Expo Router. If more routes are discovered, re-examine which files remain in `/src/app/`.

6. **Provider Initialization Order**: The app initialization depends on providers initializing in this exact order: DatabaseProvider → QueryProvider → AppInitProvider. Do not change this order.

7. **Jest Configuration**: The moved test file (`app-init.test.ts` → `/src/__tests__/app-init.test.ts`) must be in a Jest-configured directory to have access to Jest globals. The `/src/__tests__/` directory is pre-configured for this.

8. **Mock Path Updates**: When updating jest.mock paths, ensure the new paths exactly match the new file locations. Mismatched paths will cause mock resolution failures.

9. **Verification Order**: In Phase 6, verify in this order: (1) TypeScript compilation, (2) tests, (3) route discovery, (4) app initialization, (5) no Jest errors. This catches issues progressively.

10. **Event Bus Integrity**: The event bus subscriptions in `initializeApp()` must maintain their exact order for proper event flow. Verify the subscription order hasn't changed after moving the file.
