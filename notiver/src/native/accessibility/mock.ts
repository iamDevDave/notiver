/**
 * Mock implementation of the AccessibilityBridge for development.
 * Simulates accessibility actions with configurable success/failure behavior
 * when the actual native module is not available.
 */

import type { IAccessibilityBridge } from './types';

/**
 * Mock implementation of IAccessibilityBridge.
 * - isEnabled() returns a configurable value (default: false)
 * - All actions simulate success with a small delay
 * - Supports configuring failure scenarios for testing
 */
class MockAccessibilityBridge implements IAccessibilityBridge {
  private _isEnabled = false;
  private _shouldFail = false;
  private _actionLog: Array<{
    action: string;
    packageName: string;
    notificationId: string;
    timestamp: number;
    extra?: Record<string, unknown>;
  }> = [];

  async isEnabled(): Promise<boolean> {
    return this._isEnabled;
  }

  async dismissNotification(
    packageName: string,
    notificationId: string
  ): Promise<boolean> {
    this._actionLog.push({
      action: 'dismiss',
      packageName,
      notificationId,
      timestamp: Date.now(),
    });

    if (this._shouldFail) {
      console.warn(
        `[MockAccessibility] dismissNotification failed (simulated) for ${packageName}:${notificationId}`
      );
      return false;
    }

    console.log(
      `[MockAccessibility] dismissNotification: ${packageName}:${notificationId}`
    );
    return true;
  }

  async clickAction(
    packageName: string,
    actionIndex: number
  ): Promise<boolean> {
    this._actionLog.push({
      action: 'click',
      packageName,
      notificationId: '',
      timestamp: Date.now(),
      extra: { actionIndex },
    });

    if (this._shouldFail) {
      console.warn(
        `[MockAccessibility] clickAction failed (simulated) for ${packageName} action ${actionIndex}`
      );
      return false;
    }

    console.log(
      `[MockAccessibility] clickAction: ${packageName} action[${actionIndex}]`
    );
    return true;
  }

  async expandNotification(
    packageName: string,
    notificationId: string
  ): Promise<boolean> {
    this._actionLog.push({
      action: 'expand',
      packageName,
      notificationId,
      timestamp: Date.now(),
    });

    if (this._shouldFail) {
      console.warn(
        `[MockAccessibility] expandNotification failed (simulated) for ${packageName}:${notificationId}`
      );
      return false;
    }

    console.log(
      `[MockAccessibility] expandNotification: ${packageName}:${notificationId}`
    );
    return true;
  }

  async autoReply(
    packageName: string,
    notificationId: string,
    message: string
  ): Promise<boolean> {
    this._actionLog.push({
      action: 'auto_reply',
      packageName,
      notificationId,
      timestamp: Date.now(),
      extra: { message },
    });

    if (this._shouldFail) {
      console.warn(
        `[MockAccessibility] autoReply failed (simulated) for ${packageName}:${notificationId}`
      );
      return false;
    }

    console.log(
      `[MockAccessibility] autoReply: ${packageName}:${notificationId} -> "${message}"`
    );
    return true;
  }

  // --- Test helpers ---

  /** Set whether the service reports as enabled */
  setEnabled(enabled: boolean): void {
    this._isEnabled = enabled;
  }

  /** Set whether actions should simulate failure */
  setShouldFail(shouldFail: boolean): void {
    this._shouldFail = shouldFail;
  }

  /** Get the log of all actions performed */
  getActionLog(): typeof this._actionLog {
    return [...this._actionLog];
  }

  /** Clear the action log */
  clearActionLog(): void {
    this._actionLog = [];
  }

  /** Reset all mock state */
  reset(): void {
    this._isEnabled = false;
    this._shouldFail = false;
    this._actionLog = [];
  }
}

export const mockAccessibilityBridge = new MockAccessibilityBridge();
