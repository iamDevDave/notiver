/**
 * Accessibility Bridge - Main export.
 *
 * Provides a singleton instance of the accessibility service bridge.
 * Automatically selects the real native module when available (Android with
 * expo-dev-client build), or falls back to the mock implementation for
 * development/testing.
 */

export type {
  IAccessibilityBridge,
  AccessibilityActionResult,
  AccessibilityActionType,
} from './types';
export {
  ACCESSIBILITY_SERVICE_STATUS_EVENT,
  ACCESSIBILITY_ACTION_EVENT,
} from './types';

import {
  isNativeModuleAvailable,
  nativeAccessibilityBridge,
} from './AccessibilityModule';
import { mockAccessibilityBridge } from './mock';
import type { IAccessibilityBridge } from './types';

/**
 * Singleton accessibility bridge instance.
 * Uses the real native module on Android when available,
 * falls back to mock for development without native build.
 */
export const accessibilityBridge: IAccessibilityBridge =
  isNativeModuleAvailable()
    ? nativeAccessibilityBridge
    : mockAccessibilityBridge;

/**
 * Whether the bridge is using the real native module or the mock.
 * Useful for showing development indicators in the UI.
 */
export const isUsingNativeModule = isNativeModuleAvailable();
