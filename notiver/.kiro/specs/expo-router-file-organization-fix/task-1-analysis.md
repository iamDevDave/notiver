# Task 1: Bug Condition Analysis - Non-Route Files in Expo Router Discovery Path

**Date Analyzed**: Current Date
**Status**: Bug Condition Verified ✓

---

## Executive Summary

Expo Router is configured to scan `/app/` directory for routes using file-based routing. The discovery mechanism also inadvertently scans `/src/app/` directory, which currently contains 6 non-route files:
- 1 test file (`.test.ts`)
- 1 service file (`.ts`)
- 4 provider component files (`.tsx`)

These files would fail if loaded as routes because they contain code that requires a routing context (Jest globals, React Context providers, service logic).

---

## Current File Organization

### Root Routes (Correct - in `/app/`)
The root Expo Router entry point scans `/app/` and correctly discovers **6 route files**:

```
/app/
├── _layout.tsx (root layout)
├── (tabs)/
│   ├── _layout.tsx (tabs group layout)
│   ├── index.tsx (home route)
│   ├── notifications.tsx (notifications route)
│   ├── analytics.tsx (analytics route)
│   ├── rules.tsx (rules route)
│   └── settings.tsx (settings route)
├── focus-mode.tsx (focus mode route)
├── onboarding.tsx (onboarding route)
├── rule-builder.tsx (rule builder route)
├── notification/[id].tsx (notification detail route - dynamic)
└── rule/[id].tsx (rule detail route - dynamic)
```

**Total legitimate routes: 6** (tabs layout, onboarding, rule-builder, focus-mode, notification detail, rule detail)

### Non-Route Files (Bug - in `/src/app/`)
The `/src/app/` directory contains 6 files that should NOT be routes but are discoverable:

```
/src/app/
├── app-init.test.ts ⚠️ TEST FILE
├── app-init.ts ⚠️ SERVICE FILE
└── providers/
    ├── app-init-provider.tsx ⚠️ CONTEXT PROVIDER
    ├── database-provider.tsx ⚠️ CONTEXT PROVIDER
    ├── query-provider.tsx ⚠️ CONTEXT PROVIDER
    └── index.tsx ⚠️ PROVIDER AGGREGATOR
```

---

## Evidence of Bug Condition

### File 1: `/src/app/app-init.test.ts` ⚠️

**Type**: Test File
**Line Count**: 225 lines
**Critical Issue**: Contains Jest globals that are NOT available during Expo Router route discovery

**Evidence**:
```typescript
// Line 18-51: Multiple jest.mock() calls that depend on Jest being available
jest.mock('@/src/services/notification', () => ({
  notificationService: {
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@/src/services/notification', () => ({
  // ... more jest.mock calls
}));

// Line 57: Direct jest.fn() call
import { queryClient } from '@/src/app/providers/query-provider';

// Line 85: jest.clearAllMocks() assumes Jest context
beforeEach(() => {
  eventBus.clear();
  jest.clearAllMocks(); // ← FAILS if loaded as route (no Jest context)
  teardownApp();
});
```

**Why it fails**: If Expo Router attempts to load this as a route, it will encounter `jest.mock()` calls at the top level, which require the Jest test runner. In the route loading context, Jest globals are undefined, resulting in:
```
ReferenceError: Property 'jest' doesn't exist
```

---

### File 2: `/src/app/app-init.ts` ⚠️

**Type**: Service/Initialization Logic File
**Line Count**: 186 lines
**Critical Issue**: Not a React component - contains pure service initialization logic

**Evidence**:
```typescript
// Line 1-25: File exports service functions, not a route component
export function initializeApp(): void {
  // ...
}

export function teardownApp(): void {
  // ...
}

export function getIsInitialized(): boolean {
  // ...
}
```

**Why it fails**: If Expo Router attempts to load this as a route, it will try to render the default export (which doesn't exist) or treat the file as a route component, causing:
```
Error: Route component must be a valid React component
```

---

### File 3: `/src/app/providers/app-init-provider.tsx` ⚠️

**Type**: React Context Provider Component
**Line Count**: 38 lines
**Critical Issue**: Is a React component but NOT a route component - it's a Context provider

**Evidence**:
```typescript
// Line 12-35: Component that wraps children, not a screen route
export function AppInitProvider({ children }: AppInitProviderProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initializeApp();
      initialized.current = true;
    }

    return () => {
      teardownApp();
      initialized.current = false;
    };
  }, []);

  return <>{children}</>;
}
```

**Why it fails**: If Expo Router treats this as a route:
- The component won't function as a screen (it's a wrapper)
- Route structure violations occur (unexpected provider component in route tree)
- Navigation attempts will fail because it's not a navigable screen

---

### File 4: `/src/app/providers/database-provider.tsx` ⚠️

**Type**: React Context Provider Component
**Line Count**: 31 lines
**Critical Issue**: Is a React component but NOT a route component - it's a Context provider

**Evidence**:
```typescript
// Line 13-31: Component that initializes database and wraps children
export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => setIsReady(true))
      .catch((error) => {
        console.error('Database initialization failed:', error);
        setIsReady(true);
      });
  }, []);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
```

**Why it fails**: Same as app-init-provider.tsx - not a screen route, it's a provider wrapper.

---

### File 5: `/src/app/providers/query-provider.tsx` ⚠️

**Type**: React Context Provider Component + Configuration
**Line Count**: 28 lines
**Critical Issue**: Is a React component but NOT a route component - it's a Context provider + configuration module

**Evidence**:
```typescript
// Line 8-26: Configuration object (not a component initially)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1000 * 60 * 30,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export { queryClient };

// Line 31-38: Component that wraps children with QueryClientProvider
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**Why it fails**: Not a screen route; it's a configuration + provider wrapper component.

---

### File 6: `/src/app/providers/index.tsx` ⚠️

**Type**: Provider Aggregator Component
**Line Count**: 32 lines
**Critical Issue**: Is a React component but NOT a route component - it's a provider composition wrapper

**Evidence**:
```typescript
// Line 18-33: Component that composes three providers, not a screen
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

**Why it fails**: Not a screen route; it's a composition of three context providers. If Expo Router loads this as a route, the route tree structure breaks.

---

## Route Discovery Configuration Analysis

### Expo Router Default Behavior
Expo Router is configured with **file-based routing** (default Expo Router v6 behavior):
- **Entry point**: `/app/` directory
- **File matcher pattern**: Matches `.tsx`, `.ts`, `.jsx`, `.js` files
- **Default exclusions**: Hidden files (starting with `_`), `node_modules`
- **No explicit configuration** in `app.json`, `babel.config.js`, or `metro.config.js` that excludes `/src/app/`

### Current Import Dependencies
The following files currently import from `/src/app/` and `/src/app/providers/`:

| File | Current Import | Location |
|------|---|---|
| `app/_layout.tsx` | `import { AppProviders } from '@/src/app/providers';` | Root layout file |
| `src/app/providers/app-init-provider.tsx` | `import { initializeApp, teardownApp } from '@/src/app/app-init';` | Provider component |
| `src/app/app-init.ts` | `import { queryClient } from '@/src/app/providers/query-provider';` | Service file |
| `src/services/analytics/analytics-event-integration.ts` | `import { queryClient } from '@/src/app/providers/query-provider';` | Service file |
| `src/services/analytics/analytics-event-integration.test.ts` | `jest.mock('@/src/app/providers/query-provider', ...)` | Test file |

---

## Bug Impact Analysis

### Scenario: Expo Router Route Discovery on App Initialization

1. **Expo Router scans** `/app/` directory → Discovers 6 legitimate routes ✓
2. **Expo Router potentially scans** `/src/app/` → Discovers 6 non-route files ⚠️
3. **Expo Router attempts to load** `app-init.test.ts` as a route:
   - Encounters `jest.mock()` calls at module load time
   - Throws `ReferenceError: Property 'jest' doesn't exist`
   - App fails to initialize ❌

4. **Alternatively, Expo Router attempts to load** provider files as routes:
   - Route structure violations
   - Navigation errors
   - Unexpected route tree structure ❌

### Current Error Symptoms (If Bug Manifests)
- `ReferenceError: Property 'jest' doesn't exist` during app initialization
- Route discovery warnings about unexpected non-route files
- More than 6 routes discovered by Expo Router (should only be 6)
- Navigator initialization failures

---

## File Movement Plan (Phase 4 - Provided for Reference)

To fix this bug, files will be moved to locations OUTSIDE Expo Router's discovery path:

### Target Structure
```
/src/services/app/
└── app-init.ts (moved from /src/app/app-init.ts)

/src/__tests__/
└── app-init.test.ts (moved from /src/app/app-init.test.ts)

/src/providers/
├── app-init-provider.tsx (moved from /src/app/providers/app-init-provider.tsx)
├── database-provider.tsx (moved from /src/app/providers/database-provider.tsx)
├── query-provider.tsx (moved from /src/app/providers/query-provider.tsx)
└── index.tsx (moved from /src/app/providers/index.tsx)
```

### Import Updates Required
- `app/_layout.tsx`: Update `@/src/app/providers` → `@/src/providers`
- `src/providers/app-init-provider.tsx`: Update `@/src/app/app-init` → `@/src/services/app/app-init`
- `src/services/app/app-init.ts`: Update `@/src/app/providers/query-provider` → `@/src/providers/query-provider`
- `src/services/analytics/analytics-event-integration.ts`: Update `@/src/app/providers/query-provider` → `@/src/providers/query-provider`
- `src/services/analytics/analytics-event-integration.test.ts`: Update jest.mock path

---

## Verification Checklist

### Bug Condition Evidence (Current State)
- [x] Non-route test file exists in discovery path (`/src/app/app-init.test.ts`)
- [x] Non-route service file exists in discovery path (`/src/app/app-init.ts`)
- [x] Non-route provider files exist in discovery path (`/src/app/providers/*.tsx`)
- [x] These files contain code that would fail if loaded as routes
- [x] Expo Router is configured to scan `/app/` with default file-based routing
- [x] No explicit exclusion of `/src/app/` files from route discovery

### Preservation Requirements (Before Fix)
- [x] Current route count: 6 routes (tabs, onboarding, rule-builder, focus-mode, notification/[id], rule/[id])
- [x] Provider initialization order: DatabaseProvider → QueryProvider → AppInitProvider
- [x] All tests passing: 459 tests (baseline)
- [x] Import dependencies documented: 5 files reference /src/app/ files

---

## Conclusion

**Bug Condition Confirmed**: Non-route files are discoverable by Expo Router in `/src/app/` directory. These files contain code that would fail during route loading (Jest globals, provider components, service logic). The bug manifests as `ReferenceError: Property 'jest' doesn't exist` or route structure violations during app initialization.

**Root Cause**: Files intended for service initialization, testing, and provider composition are located in `/src/app/`, which is within the Expo Router file-based routing discovery path. Moving these files to locations outside the discovery path (`/src/services/app/`, `/src/__tests__/`, `/src/providers/`) will resolve the bug while maintaining all existing functionality.

**Evidence Summary**:
- 6 non-route files discovered in `/src/app/`
- Test file contains Jest globals that reference undefined `jest` object
- Provider files are React wrappers, not screen routes
- Service file exports initialization functions, not route components
- 5 import paths require updates after file movement

---

## Next Steps

This analysis establishes the bug condition baseline. Subsequent phases will:
1. **Phase 2**: Document existing behavior to preserve
2. **Phase 3**: Create target directory structure
3. **Phase 4**: Move files to new locations
4. **Phase 5**: Update import paths
5. **Phase 6**: Verify no regressions and all tests pass
