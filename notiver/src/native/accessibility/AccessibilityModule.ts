/**
 * Native module bridge for the Android AccessibilityService.
 * Connects to the Java/Kotlin native module via NativeModules and NativeEventEmitter.
 *
 * The actual native code (Java/Kotlin) must be added to the android/ directory
 * after running `npx expo prebuild`. This file provides the JS-side bridge
 * that will work with the native module once it's built.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

import type { IAccessibilityBridge } from './types';
import { ACCESSIBILITY_ACTION_EVENT } from './types';

const { AccessibilityModule: NativeModule } = NativeModules;

/**
 * Real native module bridge implementation.
 * Uses NativeModules and NativeEventEmitter to communicate with the
 * Android AccessibilityService.
 */
class NativeAccessibilityBridge implements IAccessibilityBridge {
  private emitter: NativeEventEmitter | null = null;

  private getEmitter(): NativeEventEmitter {
    if (!this.emitter) {
      this.emitter = new NativeEventEmitter(NativeModule);
    }
    return this.emitter;
  }

  async isEnabled(): Promise<boolean> {
    if (!NativeModule) {
      console.warn(
        '[AccessibilityBridge] Native module not available'
      );
      return false;
    }

    try {
      return await NativeModule.isEnabled();
    } catch (error) {
      console.error(
        '[AccessibilityBridge] Error checking service status:',
        error
      );
      return false;
    }
  }

  async dismissNotification(
    packageName: string,
    notificationId: string
  ): Promise<boolean> {
    if (!NativeModule) {
      console.warn(
        '[AccessibilityBridge] Native module not available - cannot dismiss'
      );
      return false;
    }

    try {
      return await NativeModule.dismissNotification(packageName, notificationId);
    } catch (error) {
      console.error(
        '[AccessibilityBridge] Error dismissing notification:',
        error
      );
      return false;
    }
  }

  async clickAction(
    packageName: string,
    actionIndex: number
  ): Promise<boolean> {
    if (!NativeModule) {
      console.warn(
        '[AccessibilityBridge] Native module not available - cannot click action'
      );
      return false;
    }

    try {
      return await NativeModule.clickAction(packageName, actionIndex);
    } catch (error) {
      console.error(
        '[AccessibilityBridge] Error clicking action:',
        error
      );
      return false;
    }
  }

  async expandNotification(
    packageName: string,
    notificationId: string
  ): Promise<boolean> {
    if (!NativeModule) {
      console.warn(
        '[AccessibilityBridge] Native module not available - cannot expand'
      );
      return false;
    }

    try {
      return await NativeModule.expandNotification(packageName, notificationId);
    } catch (error) {
      console.error(
        '[AccessibilityBridge] Error expanding notification:',
        error
      );
      return false;
    }
  }

  async autoReply(
    packageName: string,
    notificationId: string,
    message: string
  ): Promise<boolean> {
    if (!NativeModule) {
      console.warn(
        '[AccessibilityBridge] Native module not available - cannot auto-reply'
      );
      return false;
    }

    try {
      return await NativeModule.autoReply(packageName, notificationId, message);
    } catch (error) {
      console.error(
        '[AccessibilityBridge] Error auto-replying:',
        error
      );
      return false;
    }
  }

  /**
   * Subscribe to accessibility action events from the native module.
   * @param handler - Callback invoked when an accessibility action is performed
   * @returns Unsubscribe function
   */
  onActionPerformed(handler: (event: unknown) => void): () => void {
    if (!NativeModule) {
      console.warn(
        '[AccessibilityBridge] Native module not available - no events will be received'
      );
      return () => {};
    }

    const emitter = this.getEmitter();
    const subscription = emitter.addListener(
      ACCESSIBILITY_ACTION_EVENT,
      (event: unknown) => {
        try {
          handler(event);
        } catch (error) {
          console.error(
            '[AccessibilityBridge] Error in action handler:',
            error
          );
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }
}

/**
 * Check if the native AccessibilityModule is available.
 * It won't be available in Expo Go or when the native code hasn't been built.
 */
export function isNativeModuleAvailable(): boolean {
  return Platform.OS === 'android' && NativeModule != null;
}

export const nativeAccessibilityBridge = new NativeAccessibilityBridge();
