import { parseNotification, type ParsedNotification } from './parser';
import type { RawNotification } from '../../native/notification-listener/types';

function makeRawNotification(overrides: Partial<RawNotification> = {}): RawNotification {
  return {
    key: 'test-key-123',
    packageName: 'com.example.app',
    appName: 'Example App',
    title: 'Test Title',
    content: 'Test content body',
    sender: 'John Doe',
    timestamp: 1700000000000,
    priority: 2,
    extras: { foo: 'bar' },
    ...overrides,
  };
}

describe('parseNotification', () => {
  describe('field extraction', () => {
    it('extracts all fields from a valid raw notification', () => {
      const raw = makeRawNotification();
      const result = parseNotification(raw);

      expect(result.packageName).toBe('com.example.app');
      expect(result.appName).toBe('Example App');
      expect(result.title).toBe('Test Title');
      expect(result.content).toBe('Test content body');
      expect(result.sender).toBe('John Doe');
      expect(result.priority).toBe(2);
      expect(result.receivedAt).toEqual(new Date(1700000000000));
    });

    it('generates a valid UUID for id', () => {
      const raw = makeRawNotification();
      const result = parseNotification(raw);

      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('sets isRead and isArchived to false', () => {
      const raw = makeRawNotification();
      const result = parseNotification(raw);

      expect(result.isRead).toBe(false);
      expect(result.isArchived).toBe(false);
    });

    it('stores rawData as JSON string with key and extras', () => {
      const raw = makeRawNotification({ extras: { action: 'reply' } });
      const result = parseNotification(raw);

      expect(result.rawData).not.toBeNull();
      const parsed = JSON.parse(result.rawData!);
      expect(parsed.key).toBe('test-key-123');
      expect(parsed.extras).toEqual({ action: 'reply' });
    });

    it('sets createdAt to approximately now', () => {
      const before = Date.now();
      const result = parseNotification(makeRawNotification());
      const after = Date.now();

      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('null and empty field handling', () => {
    it('keeps null title as null', () => {
      const result = parseNotification(makeRawNotification({ title: null }));
      expect(result.title).toBeNull();
    });

    it('keeps null content as null', () => {
      const result = parseNotification(makeRawNotification({ content: null }));
      expect(result.content).toBeNull();
    });

    it('keeps null sender as null', () => {
      const result = parseNotification(makeRawNotification({ sender: null }));
      expect(result.sender).toBeNull();
    });

    it('treats empty string title as null', () => {
      const result = parseNotification(makeRawNotification({ title: '' }));
      expect(result.title).toBeNull();
    });

    it('treats whitespace-only content as null', () => {
      const result = parseNotification(makeRawNotification({ content: '   \t\n  ' }));
      expect(result.content).toBeNull();
    });

    it('treats whitespace-only sender as null', () => {
      const result = parseNotification(makeRawNotification({ sender: '  ' }));
      expect(result.sender).toBeNull();
    });
  });

  describe('timestamp handling', () => {
    it('converts valid Unix ms timestamp to Date', () => {
      const result = parseNotification(makeRawNotification({ timestamp: 1609459200000 }));
      expect(result.receivedAt).toEqual(new Date(1609459200000));
    });

    it('uses current time for zero timestamp', () => {
      const before = Date.now();
      const result = parseNotification(makeRawNotification({ timestamp: 0 }));
      const after = Date.now();

      expect(result.receivedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.receivedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('uses current time for negative timestamp', () => {
      const before = Date.now();
      const result = parseNotification(makeRawNotification({ timestamp: -100 }));
      const after = Date.now();

      expect(result.receivedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.receivedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('uses current time for NaN timestamp', () => {
      const before = Date.now();
      const result = parseNotification(makeRawNotification({ timestamp: NaN }));
      const after = Date.now();

      expect(result.receivedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.receivedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('uses current time for Infinity timestamp', () => {
      const before = Date.now();
      const result = parseNotification(makeRawNotification({ timestamp: Infinity }));
      const after = Date.now();

      expect(result.receivedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.receivedAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('priority handling', () => {
    it('preserves valid integer priority', () => {
      const result = parseNotification(makeRawNotification({ priority: 5 }));
      expect(result.priority).toBe(5);
    });

    it('truncates floating point priority to integer', () => {
      const result = parseNotification(makeRawNotification({ priority: 3.7 }));
      expect(result.priority).toBe(3);
    });

    it('defaults NaN priority to 0', () => {
      const result = parseNotification(makeRawNotification({ priority: NaN }));
      expect(result.priority).toBe(0);
    });

    it('defaults Infinity priority to 0', () => {
      const result = parseNotification(makeRawNotification({ priority: Infinity }));
      expect(result.priority).toBe(0);
    });

    it('preserves negative priority', () => {
      const result = parseNotification(makeRawNotification({ priority: -1 }));
      expect(result.priority).toBe(-1);
    });
  });

  describe('string truncation', () => {
    it('truncates very long title to 500 characters', () => {
      const longTitle = 'A'.repeat(1000);
      const result = parseNotification(makeRawNotification({ title: longTitle }));
      expect(result.title!.length).toBe(500);
    });

    it('truncates very long content to 5000 characters', () => {
      const longContent = 'B'.repeat(10000);
      const result = parseNotification(makeRawNotification({ content: longContent }));
      expect(result.content!.length).toBe(5000);
    });

    it('truncates very long sender to 200 characters', () => {
      const longSender = 'C'.repeat(500);
      const result = parseNotification(makeRawNotification({ sender: longSender }));
      expect(result.sender!.length).toBe(200);
    });

    it('does not truncate strings within limits', () => {
      const result = parseNotification(makeRawNotification({ title: 'Short title' }));
      expect(result.title).toBe('Short title');
    });
  });

  describe('required field fallbacks', () => {
    it('uses "unknown" for missing packageName', () => {
      const raw = makeRawNotification();
      (raw as any).packageName = null;
      const result = parseNotification(raw);
      expect(result.packageName).toBe('unknown');
    });

    it('uses "Unknown App" for missing appName', () => {
      const raw = makeRawNotification();
      (raw as any).appName = null;
      const result = parseNotification(raw);
      expect(result.appName).toBe('Unknown App');
    });

    it('uses "unknown" for empty packageName', () => {
      const raw = makeRawNotification();
      (raw as any).packageName = '';
      const result = parseNotification(raw);
      expect(result.packageName).toBe('unknown');
    });

    it('uses "Unknown App" for whitespace-only appName', () => {
      const raw = makeRawNotification();
      (raw as any).appName = '   ';
      const result = parseNotification(raw);
      expect(result.appName).toBe('Unknown App');
    });
  });

  describe('rawData serialization', () => {
    it('serializes extras with circular references gracefully', () => {
      const extras: Record<string, unknown> = {};
      extras.self = extras; // circular reference
      const raw = makeRawNotification({ extras });
      const result = parseNotification(raw);
      // Should return null when JSON.stringify fails
      expect(result.rawData).toBeNull();
    });

    it('serializes empty extras object', () => {
      const raw = makeRawNotification({ extras: {} });
      const result = parseNotification(raw);
      expect(result.rawData).not.toBeNull();
      const parsed = JSON.parse(result.rawData!);
      expect(parsed.extras).toEqual({});
    });
  });

  describe('unique IDs', () => {
    it('generates unique IDs for each parsed notification', () => {
      const raw = makeRawNotification();
      const result1 = parseNotification(raw);
      const result2 = parseNotification(raw);
      expect(result1.id).not.toBe(result2.id);
    });
  });
});
