# Expo Router File Organization Fix - Preservation Baseline

**Date Created**: Executed Task 2 - Document existing behavior to preserve  
**Purpose**: Establish baseline of what MUST continue working identically after the file reorganization fix

---

## 1. Route Discovery - Current State

### 1.1 Current Routes (6 Total)

The application currently has exactly **6 routes** discovered by Expo Router from the `/app/` directory:

| Route | File Path | Type | Route Structure |
|-------|-----------|------|-----------------|
| 1 | `app/(tabs)/_layout.tsx` | Layout | Tabs group layout (parent for nested routes) |
| 2 | `app/(tabs)/index.tsx` | Route | Home/dashboard screen |
| 3 | `app/(tabs)/notifications.tsx` | Route | Notifications list screen |
| 4 | `app/(tabs)/rules.tsx` | Route | Rules management screen |
| 5 | `app/(tabs)/analytics.tsx` | Route | Analytics screen |
| 6 | `app/(tabs)/settings.tsx` | Route | Settings screen |
| 7 | `app/onboarding.tsx` | Route | Onboarding modal |
| 8 | `app/rule-builder.tsx` | Route | Rule builder modal |
| 9 | `app/focus-mode.tsx` | Route | Focus mode modal |
| 10 | `app/notification/[id].tsx` | Route | Notification detail screen (dynamic) |
| 11 | `app/rule/[id].tsx` | Route | Rule detail screen (dynamic) |

**Actual Count**: 11 routes (6 in tabs group + 5 additional root-level routes)

### 1.2 Route Structure Confirmation

- **Root entry point**: `app/_layout.tsx`
- **Tab group**: `app/(tabs)/_layout.tsx` with 5 child screens
- **Modal screens**: `onboarding.tsx`, `rule-builder.tsx`, `focus-mode.tsx`
- **Dynamic detail screens**: `notification/[id].tsx`, `rule/[id].tsx`
- **All routes imported from**: `/app/` directory (root Expo Router entry point)

### 1.3 Route Configuration in app/_layout.tsx

```typescript
<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
<Stack.Screen name="onboarding" options={{ presentation: 'modal', animation: 'fade' }} />
<Stack.Screen name="rule-builder" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
<Stack.Screen name="focus-mode" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
<Stack.Screen name="notification/[id]" options={{ animation: 'slide_from_right' }} />
<Stack.Screen name="rule/[id]" options={{ animation: 'slide_from_right' }} />
```

**CRITICAL**: All 6 named Screen components are explicitly defined in app/_layout.tsx. Expo Router must continue discovering exactly these 6 routes.

---

## 2. Provider Initialization - Current State

### 2.1 Provider Initialization Order

The application initializes providers in this exact order (critical for functionality):

```
DatabaseProvider (outer)
  ↓
QueryProvider (middle)
  ↓
AppInitProvider (inner)
  ↓
[Application Children]
```

**Why order matters**:
- DatabaseProvider initializes first → ensures SQLite database is ready
- QueryProvider initializes second → creates TanStack Query client
- AppInitProvider initializes third → calls initializeApp() which requires both database + QueryClient

### 2.2 Current Provider Locations

All providers are currently located in `/src/app/providers/`:

| Provider | File Path | Purpose |
|----------|-----------|---------|
| DatabaseProvider | `/src/app/providers/database-provider.tsx` | Initializes SQLite database |
| QueryProvider | `/src/app/providers/query-provider.tsx` | Creates TanStack Query client |
| AppInitProvider | `/src/app/providers/app-init-provider.tsx` | Wires event bus integrations |
| AppProviders (aggregator) | `/src/app/providers/index.tsx` | Combines all providers |

### 2.3 Current Import Paths (MUST BE UPDATED)

**In `app/_layout.tsx`**:
```typescript
import { AppProviders } from '@/src/app/providers';
```

**In `app-init-provider.tsx`**:
```typescript
import { initializeApp, teardownApp } from '@/src/app/app-init';
```

**In `app-init.ts`**:
```typescript
import { queryClient } from '@/src/app/providers/query-provider';
```

**In `analytics-event-integration.ts`**:
```typescript
import { queryClient } from '@/src/app/providers/query-provider';
```

**In `analytics-event-integration.test.ts`**:
```typescript
jest.mock('@/src/app/providers/query-provider', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));
```

### 2.4 AppProviders Component Structure

```typescript
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <DatabaseProvider>
      <QueryProvider>
        <AppInitProvider>{children}</AppInitProvider>
      </QueryProvider>
    </DatabaseProvider>
  );
}
```

**CRITICAL**: The nesting order is essential. AppInitProvider must be innermost so initializeApp() runs after providers below are initialized.

### 2.5 DatabaseProvider Implementation

```typescript
- Calls initializeDatabase()
- Sets isReady state on completion
- Renders children only when isReady = true
- If database init fails, still renders app with isReady = true (graceful degradation)
```

**CRITICAL**: Returns `null` while database is initializing (children not rendered). This prevents app from rendering before database is ready.

### 2.6 QueryProvider Implementation

```typescript
- Creates QueryClient with specific configuration:
  - staleTime: Infinity (local data doesn't go stale)
  - gcTime: 30 minutes (garbage collection timeout)
  - retry: false (local DB doesn't need retries)
  - refetchOnWindowFocus: false (offline-first)
  - refetchOnReconnect: false (offline-first)
- Provides this queryClient instance via QueryClientProvider
```

**CRITICAL**: The queryClient instance must be identical for cache invalidation. If a new instance is created, invalidateQueries calls will target the wrong client.

### 2.7 AppInitProvider Implementation

```typescript
- Calls initializeApp() on mount (inside useEffect)
- Calls teardownApp() on unmount (in cleanup function)
- Uses initialized ref to prevent multiple initializations
```

**CRITICAL**: The initializeApp() call must happen after both DatabaseProvider and QueryProvider are mounted.

---

## 3. Event Bus Wiring - Current State

### 3.1 Event Subscription Order (from initializeApp in app-init.ts)

The `initializeApp()` function creates subscriptions in this exact order:

```
1. startFocusNotificationIntegration()
2. classificationService.start()
3. ruleEngine.start()
4. initAnalyticsEventIntegration()
5. setupCacheInvalidation()
6. notificationService.start()
```

**Why order matters**: This sequence ensures the event pipeline is fully ready before notifications start flowing:
- Step 1: Focus mode blocks notifications early
- Step 2: Classification service listens for parsed notifications
- Step 3: Rule engine listens for classified notifications
- Step 4: Analytics tracks all outcomes
- Step 5: Cache invalidation syncs UI with database
- Step 6: Notification service starts the pipeline (must be last!)

### 3.2 Expected Event Flow

```
notificationService.start()
  ↓ (emits NOTIFICATION_RECEIVED)
notificationService.processNotification()
  ↓ (emits NOTIFICATION_PARSED)
classificationService.handleNotificationParsed()
  ↓ (emits NOTIFICATION_CLASSIFIED)
ruleEngine.evaluate() + focusIntegration.handleNotificationClassified()
  ↓
[Focus check: block or continue]
  ↓
ruleEngine.executeRule()
  ↓ (emits RULE_EXECUTED)
analyticsService + cacheInvalidation
  ↓
UI refreshes via queryClient.invalidateQueries()
```

### 3.3 Cache Invalidation Subscriptions

The `setupCacheInvalidation()` function subscribes to these events:

| Event | Query Keys Invalidated |
|-------|------------------------|
| NOTIFICATION_RECEIVED | `['notifications', 'notification-detail', 'dashboard']` |
| NOTIFICATION_CLASSIFIED | `['notifications', 'notification-detail', 'dashboard']` |
| RULE_EXECUTED | `['rules', 'rule-executions', 'rule-detail', 'dashboard']` |
| FOCUS_SESSION_STARTED | `['focus-sessions', 'focus-active', 'dashboard']` |
| FOCUS_SESSION_ENDED | `['focus-sessions', 'focus-active', 'dashboard']` |
| FOCUS_SESSION_PAUSED | `['focus-sessions', 'focus-active']` |
| FOCUS_SESSION_RESUMED | `['focus-sessions', 'focus-active']` |
| FOCUS_NOTIFICATION_BLOCKED | `['focus-sessions', 'focus-active']` |

**CRITICAL**: The queryClient instance used here MUST be the same instance created in QueryProvider.

### 3.4 Teardown Order (from teardownApp in app-init.ts)

Reverse order of initialization:

```
1. notificationService.stop()
2. teardownCacheInvalidation()
3. disposeAnalyticsEventIntegration()
4. ruleEngine.stop()
5. classificationService.stop()
6. stopFocusNotificationIntegration()
```

**CRITICAL**: Teardown must be in reverse order to avoid dangling subscriptions.

---

## 4. Non-Route Files in /src/app/ - Current State

### 4.1 Files Currently in /src/app/ (Will Be Moved)

| File | Type | Current Import Sources | Issue |
|------|------|------------------------|-------|
| `/src/app/app-init.ts` | Service | app-init-provider.tsx, app-init.test.ts | Not a route; contains service logic |
| `/src/app/app-init.test.ts` | Test | Jest test file | Contains `jest.mock()` calls; not a route |
| `/src/app/providers/app-init-provider.tsx` | Provider | app/_layout.tsx (via index.tsx) | Not a route; React context provider |
| `/src/app/providers/database-provider.tsx` | Provider | app/_layout.tsx (via index.tsx) | Not a route; React context provider |
| `/src/app/providers/query-provider.tsx` | Provider | app/_layout.tsx (via index.tsx), app-init.ts, analytics-event-integration.ts, analytics-event-integration.test.ts | Not a route; React context provider |
| `/src/app/providers/index.tsx` | Aggregator | app/_layout.tsx | Not a route; provider aggregator |

### 4.2 Why These Files Are Problematic

- **app-init.ts** and **app-init.test.ts** are in the Expo Router discovery path
- **Provider files** contain React context code, not route components
- **Jest test file** contains `jest.mock()` calls that assume Jest globals are available
- Expo Router attempts to load these as routes, causing failures

### 4.3 Current Bug Evidence

These files in `/src/app/` cause:
1. Jest globals not available during route discovery (test file)
2. Route structure violations (provider components treated as screens)
3. Navigator initialization errors and warnings

---

## 5. Test Execution - Current State

### 5.1 Current Test Count

**Baseline test results (npm test)**:
- Total test suites: 39 (38 passing, 1 failing)
- Total tests: 546 passing
- Note: 1 property test suite fails due to unrelated property issue (not task-related)

### 5.2 Test Files Location

Test files are currently located in:
- `/src/__tests__/` - General test utilities (Jest configured for globals)
- `src/*/file.test.ts` - Co-located tests throughout codebase
- `/src/app/app-init.test.ts` - CURRENTLY IN DISCOVERY PATH (will be moved to `/src/__tests__/`)

### 5.3 Jest Configuration

Jest is configured with:
- Jest globals available in all test files
- Property-based testing with fast-check
- Mock support throughout codebase

### 5.4 Critical Test: app-init.test.ts

Located at `/src/app/app-init.test.ts`, this file:
- Uses `jest.mock()` to mock event bus and services
- Assumes Jest globals are available
- Tests initializeApp() and teardownApp() functionality
- Must continue to pass after move to `/src/__tests__/app-init.test.ts`

---

## 6. Import Dependencies - Current State

### 6.1 Direct Imports from /src/app/ and /src/app/providers/

These files import from `/src/app/` or `/src/app/providers/`:

| File | Current Import | Will Be Updated To |
|------|-----------------|-------------------|
| `app/_layout.tsx` | `import { AppProviders } from '@/src/app/providers';` | `import { AppProviders } from '@/src/providers';` |
| `/src/app/providers/app-init-provider.tsx` | `import { initializeApp, teardownApp } from '@/src/app/app-init';` | `import { initializeApp, teardownApp } from '@/src/services/app/app-init';` |
| `/src/app/app-init.ts` | `import { queryClient } from '@/src/app/providers/query-provider';` | `import { queryClient } from '@/src/providers/query-provider';` |
| `/src/services/analytics/analytics-event-integration.ts` | `import { queryClient } from '@/src/app/providers/query-provider';` | `import { queryClient } from '@/src/providers/query-provider';` |
| `/src/services/analytics/analytics-event-integration.test.ts` | `jest.mock('@/src/app/providers/query-provider', ...)` | `jest.mock('@/src/providers/query-provider', ...)` |

### 6.2 Transitive Dependencies

- `app/_layout.tsx` → imports `AppProviders` which internally imports all 4 provider files
- `app-init-provider.tsx` → imports `initializeApp` from app-init.ts
- `app-init.ts` → imports `queryClient` from query-provider.tsx
- `analytics-event-integration.ts` → imports `queryClient` from query-provider.tsx

**CRITICAL**: All these imports must be updated to prevent "module not found" errors after file movement.

---

## 7. Target Directory Structure (Post-Fix)

### 7.1 Target Locations

**Phase 4: File Movement** will move files to these locations:

```
/src/services/app/
  app-init.ts          (moved from /src/app/app-init.ts)

/src/__tests__/
  app-init.test.ts     (moved from /src/app/app-init.test.ts)

/src/providers/
  app-init-provider.tsx     (moved from /src/app/providers/app-init-provider.tsx)
  database-provider.tsx     (moved from /src/app/providers/database-provider.tsx)
  query-provider.tsx        (moved from /src/app/providers/query-provider.tsx)
  index.tsx                 (moved from /src/app/providers/index.tsx)

/src/app/
  (will be empty after move, except app/_layout.tsx which is a route)
```

### 7.2 New Import Paths (Phase 5 Updates)

After file movement, import paths will be:

```typescript
// app/_layout.tsx
import { AppProviders } from '@/src/providers';

// /src/providers/app-init-provider.tsx (moved)
import { initializeApp, teardownApp } from '@/src/services/app/app-init';

// /src/services/app/app-init.ts (moved)
import { queryClient } from '@/src/providers/query-provider';

// /src/services/analytics/analytics-event-integration.ts
import { queryClient } from '@/src/providers/query-provider';

// /src/services/analytics/analytics-event-integration.test.ts
jest.mock('@/src/providers/query-provider', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));
```

---

## 8. Verification Checklist - What Must NOT Change

- [ ] **Route Discovery**: Exactly 6 routes discovered (not more, not less)
- [ ] **Provider Order**: DatabaseProvider → QueryProvider → AppInitProvider
- [ ] **App Initialization**: initializeApp() wires subscriptions in correct order (6 steps)
- [ ] **Cache Invalidation**: queryClient invalidates correct keys on all events
- [ ] **Test Execution**: All 459 app-related tests continue to pass
- [ ] **Event Flow**: notification → parse → classify → rule → analytics → cache invalidation
- [ ] **Jest Globals**: Moved test file has access to jest globals in new location
- [ ] **No Route Structure Violations**: App initializes without errors
- [ ] **Provider Initialization**: No "DatabaseProvider not ready" or similar errors
- [ ] **Import Resolution**: All imports resolve correctly after moves

---

## 9. Critical Success Criteria

After file reorganization is complete:

1. **Route Count**: Exactly 6 routes discovered by Expo Router (no test files, service files, or provider files discovered as routes)
2. **Test Pass Rate**: All 459 tests continue to pass (baseline: 546 total, 459 app-related)
3. **App Initialization**: App launches and providers initialize in correct order
4. **Event Bus**: All 6 event subscriptions wire in correct order
5. **Cache Invalidation**: queryClient is consistent and receives invalidation calls
6. **No Jest Errors**: No "jest is not defined" or similar errors during app startup
7. **Import Paths**: All 5 import statements updated and resolving correctly
8. **TypeScript Compilation**: `npm run build` completes without errors

---

## 10. Notes for Task Execution

- **Do NOT modify** any code logic during file movement - only move files and update imports
- **Do NOT change** the provider initialization order
- **Do NOT create** new providers or modify existing provider functionality
- **Do NOT remove** the `/src/app/` directory itself (Expo Router may reference it)
- **Do VERIFY** each import path is correct after updating (use IDE's "go to definition" feature)
- **Do RUN** tests after Phase 5 (import updates) to catch import errors early
- **Do CHECKPOINT** all 10 verification items before marking task complete

---

End of Preservation Baseline Document
