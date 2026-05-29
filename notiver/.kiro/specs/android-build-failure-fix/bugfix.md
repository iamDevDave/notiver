# Bugfix Requirements Document

## Introduction

The Notiver Expo React Native app fails to build and run on Android. Running
`npx expo export --platform android` lets Metro bundle all 1519 modules
successfully, but the subsequent Hermes compilation step (`hermesc.exe`) fails
with hundreds of `error: private properties are not supported` errors on class
private fields (`#x`, `#y`, `#width`, `#height`, ...). The build exits non-zero
and the app cannot run on Android.

The primary cause is a set of dependency versions that do not match the
installed Expo SDK (`expo@54.0.35`). The most critical mismatch is
`babel-preset-expo` (installed `56.0.13`, expected `~54.0.10`). The SDK 56 babel
preset assumes a newer Hermes and stops transpiling private class fields, so
untranspiled `#field` syntax reaches the SDK 54 Hermes engine, which rejects it.

A separate, independent runtime defect also exists: `src/database/repositories/index.ts`
uses re-exported names as local bindings. Re-export specifiers
(`export { X } from './x'`) do not create local bindings, so the later
`export const x = new X()` statements throw a `ReferenceError` at runtime.

This bugfix aligns the dependency versions to the installed SDK and corrects the
repository export bindings so the Android build compiles cleanly under Hermes and
the app runs without runtime initialization errors.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `npx expo export --platform android` is run THEN the system fails the Hermes compilation step (`hermesc.exe`) with hundreds of `error: private properties are not supported` errors and exits with a non-zero status.

1.2 WHEN the bundle contains class private fields (e.g. `#x`, `#y`, `#width`, `#height`) THEN the system passes that syntax untranspiled to the SDK 54 Hermes compiler because `babel-preset-expo@56.0.13` no longer transpiles private class fields.

1.3 WHEN `npx expo install --check` is run THEN the system reports multiple dependencies whose installed versions do not match the installed Expo SDK 54 (`babel-preset-expo`, `expo-blur`, `expo-linear-gradient`, `@shopify/flash-list`, `react-native-svg`, `@react-navigation/native-stack`, `jest`).

1.4 WHEN the app loads `src/database/repositories/index.ts` at runtime THEN the system throws a `ReferenceError` because the singleton declarations (`new NotificationRepository()`, etc.) reference names that were only re-exported and never bound locally.

### Expected Behavior (Correct)

2.1 WHEN `npx expo export --platform android` is run THEN the system SHALL complete the Hermes compilation step without any `private properties are not supported` errors and exit with a zero status.

2.2 WHEN the bundle contains class private fields THEN the system SHALL transpile them to SDK 54 / Hermes-compatible output before they reach the Hermes compiler.

2.3 WHEN `npx expo install --check` is run THEN the system SHALL report that all dependency versions are compatible with the installed Expo SDK 54.

2.4 WHEN the app loads `src/database/repositories/index.ts` at runtime THEN the system SHALL instantiate the repository singletons without throwing a `ReferenceError`, while continuing to export the same repository classes and singleton instances.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN Metro bundles the application THEN the system SHALL CONTINUE TO resolve and bundle all application modules successfully.

3.2 WHEN other modules import named repository classes (e.g. `NotificationRepository`) or singleton instances (e.g. `notificationRepository`) from `src/database/repositories` THEN the system SHALL CONTINUE TO receive the same exported names and equivalent instances as before.

3.3 WHEN the app is run via the development server or on web THEN the system SHALL CONTINUE TO behave as it did before the fix.

3.4 WHEN application feature code that is unrelated to dependency versions or repository exports executes THEN the system SHALL CONTINUE TO behave as it did before the fix.
