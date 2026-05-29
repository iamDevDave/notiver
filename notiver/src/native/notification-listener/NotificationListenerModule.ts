/**
 * Native module bridge for the Android NotificationListenerService.
 * Connects to the Java/Kotlin native module via NativeModules and NativeEventEmitter.
 *
 * The actual native code (Java/Kotlin) must be added to the android/ directory
 * after running `npx expo prebuild`. This file provides the JS-side bridge
 * that will work with the native module once it's built.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

import type { INotificationListenerBridge, RawNotification } from './types';
import { NOTIFICATION_RECEIVED_EVENT } from './types';

const { NotificationListenerModule: NativeModule } = NativeModules;

/**
 * Real native module bridge implementation.
 * Uses NativeModules and NativeEventEmitter to communicate with the
 * Android NotificationListenerService.
 */
class NativeNotificationListenerBridge implements INotificationListenerBridge {
  private emitter: NativeEventEmitter | null = null;

  private getEmitter(): NativeEventEmitter {
    if (!this.emitter) {
      this.emitter = new NativeEventEmitter(NativeModule);
    }
    return this.emitter;
  }

  async isRunning(): Promise<boolean> {
    if (!NativeModule) {
      console.warn(
        '[NotificationListenerBridge] Native module not available'
      );
      return false;
    }

    try {
      return await NativeModule.isRunning();
    } catch (error) {
      console.error(
        '[NotificationListenerBridge] Error checking service status:',
        error
      );
      return false;
    }
  }

  async requestRestart(): Promise<void> {
    if (!NativeModule) {
      console.warn(
        '[NotificationListenerBridge] Native module not available - cannot restart'
      );
      return;
    }

    try {
      await NativeModule.requestRestart();
    } catch (error) {
      console.error(
        '[NotificationListenerBridge] Error requesting restart:',
        error
      );
      throw error;
    }
  }

  onNotificationReceived(handler: (raw: RawNotification) => void): () => void {
    if (!NativeModule) {
      console.warn(
        '[NotificationListenerBridge] Native module not available - no notifications will be received'
      );
      return () => {};
    }

    const emitter = this.getEmitter();
    const subscription = emitter.addListener(
      NOTIFICATION_RECEIVED_EVENT,
      (event: RawNotification) => {
        try {
          handler(event);
        } catch (error) {
          console.error(
            '[NotificationListenerBridge] Error in notification handler:',
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
 * Check if the native NotificationListenerModule is available.
 * It won't be available in Expo Go or when the native code hasn't been built.
 */
export function isNativeModuleAvailable(): boolean {
  return Platform.OS === 'android' && NativeModule != null;
}

export const nativeNotificationListenerBridge = new NativeNotificationListenerBridge();
