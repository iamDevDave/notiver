/**
 * Mock implementation of the NotificationListenerBridge for development.
 * Emits fake notifications on a timer for UI development and testing
 * when the actual native module is not available.
 */

import type { INotificationListenerBridge, RawNotification } from './types';

const MOCK_APPS = [
  { packageName: 'com.whatsapp', appName: 'WhatsApp' },
  { packageName: 'com.google.android.gm', appName: 'Gmail' },
  { packageName: 'com.slack', appName: 'Slack' },
  { packageName: 'com.twitter.android', appName: 'X' },
  { packageName: 'com.instagram.android', appName: 'Instagram' },
  { packageName: 'com.spotify.music', appName: 'Spotify' },
];

const MOCK_TITLES = [
  'New message from John',
  'Meeting in 15 minutes',
  'Your order has shipped',
  '50% off sale today!',
  'Security alert',
  'Reminder: Call dentist',
  'Breaking news update',
  'New follower',
];

const MOCK_CONTENTS = [
  'Hey, are you free for lunch today?',
  'Team standup at 10:00 AM in Room 3B',
  'Your package is on its way and will arrive by Thursday.',
  'Limited time offer - use code SAVE50 at checkout',
  'A new sign-in was detected on your account from Chrome on Windows.',
  "Don't forget your appointment tomorrow at 2 PM",
  'Major developments in the tech industry today...',
  'Someone started following your profile',
];

function generateMockNotification(): RawNotification {
  const app = MOCK_APPS[Math.floor(Math.random() * MOCK_APPS.length)];
  const titleIndex = Math.floor(Math.random() * MOCK_TITLES.length);

  return {
    key: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    packageName: app.packageName,
    appName: app.appName,
    title: MOCK_TITLES[titleIndex],
    content: MOCK_CONTENTS[titleIndex],
    sender: Math.random() > 0.5 ? 'John Doe' : null,
    timestamp: Date.now(),
    priority: Math.floor(Math.random() * 5),
    extras: {},
  };
}

/**
 * Mock implementation of INotificationListenerBridge.
 * - isRunning() always returns false (simulates service not running)
 * - requestRestart() is a no-op
 * - onNotificationReceived() can optionally emit fake notifications on a timer
 */
class MockNotificationListenerBridge implements INotificationListenerBridge {
  private handlers: Set<(raw: RawNotification) => void> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private _isRunning = false;

  async isRunning(): Promise<boolean> {
    return this._isRunning;
  }

  async requestRestart(): Promise<void> {
    console.warn(
      '[MockNotificationListener] requestRestart() called - no-op in mock mode'
    );
  }

  onNotificationReceived(handler: (raw: RawNotification) => void): () => void {
    this.handlers.add(handler);

    // Start emitting mock notifications if this is the first subscriber
    if (this.handlers.size === 1) {
      this.startEmitting();
    }

    return () => {
      this.handlers.delete(handler);
      if (this.handlers.size === 0) {
        this.stopEmitting();
      }
    };
  }

  /** Start emitting mock notifications every 10 seconds */
  private startEmitting(): void {
    if (this.intervalId !== null) return;

    this._isRunning = true;
    this.intervalId = setInterval(() => {
      const notification = generateMockNotification();
      this.handlers.forEach((handler) => {
        try {
          handler(notification);
        } catch (error) {
          console.error('[MockNotificationListener] Handler error:', error);
        }
      });
    }, 10_000);
  }

  /** Stop emitting mock notifications */
  private stopEmitting(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this._isRunning = false;
  }

  /** Manually emit a notification (useful for testing) */
  emitMockNotification(notification?: Partial<RawNotification>): void {
    const mock = { ...generateMockNotification(), ...notification };
    this.handlers.forEach((handler) => {
      try {
        handler(mock);
      } catch (error) {
        console.error('[MockNotificationListener] Handler error:', error);
      }
    });
  }
}

export const mockNotificationListenerBridge = new MockNotificationListenerBridge();
