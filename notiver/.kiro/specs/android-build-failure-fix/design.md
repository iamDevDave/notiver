# Android Build Failure Fix — Bugfix Design

## Overview

The Notiver Expo app cannot be built for Android. Metro bundles all 1519 modules
successfully, but the Hermes compilation step (`hermesc.exe`) then fails with
hundreds of `error: private properties are not supported` errors on class
private fields (`#x`, `#y`, `#width`, `#height`, ...), and the build exits
non-zero.

The fix strategy has two parts:

1. **Align dependency versions to the installed Expo SDK (`expo@54.0.35`).** The
   critical mismatch is `babel-preset-expo@56.0.13` (expected `~54.0.10`). The
   SDK 56 preset assumes a newer Hermes and stops transpiling private class
   fields, so the untranspiled `#field` syntax reaches the SDK 54 Hermes
   compiler, which rejects it. Re-pinning the preset (and the other mismatched
   packages) to the SDK-54-compatible versions restores private-field
   transpilation so Hermes receives compatible output.

2. **Fix a separate runtime defect in `src/database/repositories/index.ts`.** The
   file re-exports repository classes with `export { X } from './x'` and then
   declares singletons with `export const x = new X()`. Re-export specifiers do
   not create local bindings, so the `new X()` calls reference undefined names
   and throw a `ReferenceError` at runtime. The fix introduces proper `import`
   statements for the classes used to construct singletons.

The fix is intended to be minimal and targeted: change dependency versions and
the repository index export bindings only, preserving all other behavior.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — building the
  Android bundle while (a) dependency versions are mismatched against Expo SDK 54
  (notably `babel-preset-expo`), causing private class fields to reach Hermes
  untranspiled, and/or (b) the repository index module is evaluated, throwing a
  `ReferenceError`.
- **Property (P)**: The desired behavior — `npx expo export --platform android`
  completes Hermes compilation with no `private properties are not supported`
  errors and a zero exit code, and the repository index module instantiates its
  singletons without throwing.
- **Preservation**: Behavior that must remain unchanged — Metro module
  resolution/bundling, the names and instances exported from
  `src/database/repositories`, and all dev-server / web / unrelated feature
  behavior.
- **Expo SDK 54**: The installed SDK (`expo@54.0.35`). Each Expo SDK expects a
  specific compatible set of dependency versions.
- **babel-preset-expo**: The Babel preset that transpiles app/source syntax
  (including class private fields) into output compatible with the SDK's bundled
  Hermes engine. The SDK-54-compatible version is `~54.0.10`.
- **Hermes (`hermesc.exe`)**: The JavaScript engine compiler invoked after Metro
  bundling. The SDK 54 Hermes does not support raw private class field syntax.
- **Re-export binding**: An `export { X } from './x'` statement re-exports `X`
  without creating a local binding usable in the same module.

## Bug Details

### Bug Condition

The bug manifests in two independent ways during an Android build/run:

- **Primary (build-time)**: When the Android bundle is produced and the toolchain
  includes `babel-preset-expo@56.0.13` (instead of `~54.0.x`), class private
  fields are not transpiled and reach the SDK 54 Hermes compiler, which fails
  with `private properties are not supported`.
- **Secondary (runtime)**: When `src/database/repositories/index.ts` is
  evaluated, the singleton constructor expressions reference names that exist
  only as re-export specifiers, throwing a `ReferenceError`.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type BuildOrLoadEvent
  OUTPUT: boolean

  // Primary: Android build with mismatched babel preset
  primary := input.kind = 'androidExport'
             AND babelPresetExpoMajorVersion <> expoSdkMajorVersion
             AND bundleContainsPrivateClassFields(input)

  // Secondary: repository index module evaluated with re-export-only bindings
  secondary := input.kind = 'moduleLoad'
               AND input.module = 'src/database/repositories/index.ts'
               AND singletonReferencesReExportOnlyName(input)

  RETURN primary OR secondary
END FUNCTION
```

### Examples

- `npx expo export --platform android` → Metro bundles 1519 modules OK, then
  `hermesc.exe` emits hundreds of `error: private properties are not supported`
  on `#x`, `#y`, `#width`, `#height` and the build exits non-zero.
  Expected: Hermes compilation completes with zero such errors and exit code 0.
- `npx expo install --check` → reports `babel-preset-expo` installed `56.0.13`,
  expected `~54.0.10` (plus other mismatches). Expected: reports all dependencies
  compatible.
- Evaluating `src/database/repositories/index.ts` → `new NotificationRepository()`
  throws `ReferenceError: NotificationRepository is not defined`.
  Expected: the singleton is constructed and exported without error.
- Edge case: bundling on the dev server (Metro only, no Hermes compile) does not
  surface the private-properties error, but the runtime `ReferenceError` can
  still occur — expected behavior is no error in either path after the fix.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Metro module resolution and bundling of all application modules must continue
  to succeed (all 1519 modules).
- The named exports of `src/database/repositories` (`BaseRepository`,
  `NotificationRepository`, `RuleRepository`, `RuleExecutionRepository`,
  `AnalyticsRepository`, `FocusSessionRepository`, `SettingsRepository`,
  `AIPredictionRepository`) and the singleton instances
  (`notificationRepository`, `ruleRepository`, `ruleExecutionRepository`,
  `analyticsRepository`, `focusSessionRepository`, `settingsRepository`,
  `aiPredictionRepository`) must remain available with the same names and
  equivalent instances.
- Development server and web behavior must remain unchanged.
- Application feature behavior unrelated to dependency versions and repository
  exports must remain unchanged.

**Scope:**
All inputs that do NOT involve the Android Hermes build with a mismatched babel
preset, and do NOT involve evaluating the repository index module, should be
completely unaffected by this fix. This includes:
- Metro bundling itself (module graph, resolution).
- Consumers importing repository classes/instances by name.
- Dev-server and web runtime paths.
- Unrelated feature/business logic.

> Note: The TypeScript errors reported in `*.test.ts` / `*.property.test.ts`
> files (e.g. `jest.Mock` namespace errors from jest 30 vs expected 29) are NOT
> bundled by Metro and do NOT affect the Android build. They are caused by the
> same `jest` version mismatch and are treated as out-of-scope follow-up here.
> Re-aligning `jest` to `~29.7.0` as part of dependency alignment is expected to
> resolve them, but they are not gating for the Android build.

## Hypothesized Root Cause

Based on the confirmed reproduction and `npx expo install --check` output, the
causes are:

1. **Mismatched `babel-preset-expo` (PRIMARY)**: Installed `56.0.13`, expected
   `~54.0.10`. The SDK 56 preset assumes a newer Hermes and no longer transpiles
   private class fields. Untranspiled `#field` syntax then reaches the SDK 54
   Hermes (`hermesc.exe`), which rejects it with `private properties are not
   supported`.

2. **Other SDK-mismatched dependencies**: Installed-vs-expected mismatches that
   should be aligned to SDK 54:
   - `expo-blur`: `56.0.3` → `~15.0.8`
   - `expo-linear-gradient`: `56.0.4` → `~15.0.8`
   - `@shopify/flash-list`: `2.3.1` → `2.0.2`
   - `react-native-svg`: `15.15.5` → `15.12.1`
   - `@react-navigation/native-stack`: `^7.16.0` → `^7.3.16`
   - `jest`: `30.4.1` → `~29.7.0` (affects tests only, not the bundle)

3. **Re-export used as local binding (SECONDARY, runtime)**: In
   `src/database/repositories/index.ts`, `export { X } from './x'` does not create
   a local binding, so `export const x = new X()` references an undefined name and
   throws `ReferenceError` at runtime.

## Correctness Properties

Property 1: Bug Condition - Android Hermes Build Succeeds

_For any_ Android export build where the bug condition holds (isBugCondition
returns true for an `androidExport` input), the fixed toolchain SHALL complete
the Hermes compilation step with zero `private properties are not supported`
errors and a zero exit code, because dependency versions (notably
`babel-preset-expo`) are aligned to Expo SDK 54 and private class fields are
transpiled before reaching Hermes.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Repository Exports and Bundling Unchanged

_For any_ input where the bug condition does NOT hold (isBugCondition returns
false) — Metro bundling, consumers importing repository classes/instances by
name, and dev-server/web/unrelated feature paths — the fixed code SHALL produce
the same result as the original, preserving successful module bundling and the
same exported names and equivalent repository singleton instances.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

Property 3: Bug Condition - Repository Singletons Initialize Without ReferenceError

_For any_ evaluation of `src/database/repositories/index.ts` (a `moduleLoad`
input where the bug condition holds), the fixed module SHALL instantiate all
repository singletons without throwing a `ReferenceError`, while still exporting
the same classes and singleton instances.

**Validates: Requirements 2.4**

## Fix Implementation

### Changes Required

Assuming the root cause analysis is correct:

**Change 1 — Align dependency versions to Expo SDK 54**

**File**: `package.json` (applied via the Expo CLI, then reinstall)

**Specific Changes**:
1. **Run the SDK check**: `npx expo install --check` to confirm the reported
   mismatches.
2. **Apply SDK-compatible versions**: `npx expo install --fix` (or explicit
   `npx expo install <pkg>@<expected>`), targeting at minimum:
   - `babel-preset-expo` → `~54.0.10` (CRITICAL — restores private-field
     transpilation)
   - `expo-blur` → `~15.0.8`
   - `expo-linear-gradient` → `~15.0.8`
   - `@shopify/flash-list` → `2.0.2`
   - `react-native-svg` → `15.12.1`
   - `@react-navigation/native-stack` → `^7.3.16`
   - `jest` → `~29.7.0` (and aligned jest-related devDependencies; tests only)
3. **Reinstall**: ensure `node_modules` and lockfile reflect the corrected
   versions (clean install if needed) so the corrected `babel-preset-expo` is
   actually used by Metro/Babel.
4. **Re-verify**: `npx expo install --check` reports all dependencies compatible.

**Change 2 — Fix repository index export bindings**

**File**: `src/database/repositories/index.ts`

**Specific Changes**:
1. **Add local imports** for the classes used to construct singletons, e.g.
   `import { NotificationRepository } from './notification.repository'` (and the
   same for `RuleRepository`, `RuleExecutionRepository`, `AnalyticsRepository`,
   `FocusSessionRepository`, `SettingsRepository`, `AIPredictionRepository`).
2. **Re-export the imported names** (e.g. `export { NotificationRepository }`),
   replacing the `export { X } from './x'` re-export specifiers with
   import-then-export so the names exist as local bindings.
3. **Keep `BaseRepository` and the singleton declarations** unchanged in their
   exported names so consumers are unaffected; the `new X()` expressions now
   resolve against the locally bound imports.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples
that demonstrate the bug on the UNFIXED code, then verify the fix works correctly
and preserves existing behavior. Because the primary defect is a build-toolchain
failure, the "exploration test" is a reproducible build/compilation check rather
than a pure unit test.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing
the fix. Confirm or refute the root cause analysis. If refuted, re-hypothesize.

**Test Plan**: Run the Android export and assert the Hermes step does not emit
`private properties are not supported`. Separately, evaluate the repository index
module and assert no `ReferenceError`. Run both on the UNFIXED code to observe
failures.

**Test Cases**:
1. **Android Hermes Compile**: Run `npx expo export --platform android` and scan
   output for `private properties are not supported` (will fail on unfixed code).
2. **SDK Compatibility Check**: Run `npx expo install --check` and assert no
   mismatches reported (will fail on unfixed code — lists `babel-preset-expo`
   etc.).
3. **Repository Init**: Import `src/database/repositories/index.ts` and assert it
   loads without `ReferenceError` (will fail on unfixed code).

**Expected Counterexamples**:
- Hundreds of `error: private properties are not supported` from `hermesc.exe`.
- `npx expo install --check` lists `babel-preset-expo 56.0.13 → ~54.0.10` (and
  others).
- `ReferenceError: NotificationRepository is not defined` when the repo index
  module is evaluated.
- Possible causes: mismatched babel preset (private fields untranspiled),
  re-export specifiers used as local bindings.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed
toolchain/code produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  IF input.kind = 'androidExport' THEN
    result := runAndroidExport_fixed(input)
    ASSERT result.exitCode = 0 AND NOT containsPrivatePropertiesError(result)
  ELSE IF input.kind = 'moduleLoad' THEN
    ASSERT loadRepositoryIndex_fixed() does not throw ReferenceError
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the
fixed code produces the same result as the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT original(input) = fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation
checking because:
- It generates many test cases automatically across the input domain.
- It catches edge cases that manual unit tests might miss.
- It provides strong guarantees that behavior is unchanged for non-buggy inputs.

**Test Plan**: Observe behavior on UNFIXED code first — Metro bundling succeeds,
and consumers receive the same repository names/instances — then write tests that
assert those observations continue to hold after the fix.

**Test Cases**:
1. **Bundling Preservation**: Verify Metro still resolves and bundles all modules
   after the fix.
2. **Repository Export Preservation**: Verify every exported name
   (`NotificationRepository`, `notificationRepository`, ...) is still present and
   the singleton instances are of the expected class after the fix.
3. **Dev/Web Preservation**: Verify dev-server/web startup behavior is unchanged.

### Unit Tests

- Test that importing `src/database/repositories/index.ts` exposes all expected
  class exports and singleton instances without throwing.
- Test that each singleton is an instance of its corresponding repository class.

### Property-Based Tests

- For all repository export names in the expected set, the module exports a
  defined value (class or instance) — preservation across the full export set.
- For all repository singletons, `instance instanceof ExpectedClass` holds.

### Integration Tests

- Run `npx expo export --platform android` end-to-end and assert Hermes
  compilation completes with zero `private properties are not supported` errors
  and a zero exit code.
- Run `npx expo install --check` and assert all dependencies report compatible
  with the installed SDK.
