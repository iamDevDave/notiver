import type { ParsedNotification } from '../../../../services/notification/parser';
import { AppTriggerHandler } from './app-trigger';
import { KeywordTriggerHandler } from './keyword-trigger';
import { ContactTriggerHandler } from './contact-trigger';
import { TimeTriggerHandler } from './time-trigger';
import { LocationTriggerHandler } from './location-trigger';
import { FrequencyTriggerHandler } from './frequency-trigger';
import { triggerRegistry, getTriggerHandler } from './index';

function createNotification(overrides: Partial<ParsedNotification> = {}): ParsedNotification {
  return {
    id: 'test-id',
    packageName: 'com.example.app',
    appName: 'Example App',
    title: 'Test Title',
    content: 'Test content message',
    sender: 'John Doe',
    priority: 0,
    isRead: false,
    isArchived: false,
    rawData: null,
    receivedAt: new Date('2024-01-15T10:30:00'),
    createdAt: new Date('2024-01-15T10:30:00'),
    ...overrides,
  };
}

describe('AppTriggerHandler', () => {
  const handler = new AppTriggerHandler();

  it('matches when packageName is in apps array', () => {
    const notification = createNotification({ packageName: 'com.whatsapp' });
    const config = { apps: ['com.whatsapp', 'com.telegram'] };
    expect(handler.evaluate(notification, config)).toBe(true);
  });

  it('matches case-insensitively', () => {
    const notification = createNotification({ packageName: 'com.WhatsApp' });
    const config = { apps: ['com.whatsapp'] };
    expect(handler.evaluate(notification, config)).toBe(true);
  });

  it('does not match when packageName is not in apps array', () => {
    const notification = createNotification({ packageName: 'com.slack' });
    const config = { apps: ['com.whatsapp', 'com.telegram'] };
    expect(handler.evaluate(notification, config)).toBe(false);
  });

  it('returns false for empty apps array', () => {
    const notification = createNotification();
    const config = { apps: [] };
    expect(handler.evaluate(notification, config)).toBe(false);
  });

  it('returns false for missing apps config', () => {
    const notification = createNotification();
    expect(handler.evaluate(notification, {})).toBe(false);
  });

  it('returns false for invalid apps config (not array)', () => {
    const notification = createNotification();
    const config = { apps: 'com.whatsapp' };
    expect(handler.evaluate(notification, config as any)).toBe(false);
  });
});

describe('KeywordTriggerHandler', () => {
  const handler = new KeywordTriggerHandler();

  it('matches keyword in title', () => {
    const notification = createNotification({ title: 'Urgent: meeting at 3pm' });
    const config = { keywords: ['urgent'] };
    expect(handler.evaluate(notification, config)).toBe(true);
  });

  it('matches keyword in content', () => {
    const notification = createNotification({ content: 'Please review the urgent report' });
    const config = { keywords: ['urgent'] };
    expect(handler.evaluate(notification, config)).toBe(true);
  });

  it('matches case-insensitively by default', () => {
    const notification = createNotification({ title: 'URGENT notification' });
    const config = { keywords: ['urgent'] };
    expect(handler.evaluate(notification, config)).toBe(true);
  });

  it('respects caseSensitive option', () => {
    const notification = createNotification({ title: 'URGENT notification' });
    const config = { keywords: ['urgent'], caseSensitive: true };
    expect(handler.evaluate(notification, config)).toBe(false);
  });

  it('matches any keyword from the list', () => {
    const notification = createNotification({ title: 'Sale ends today' });
    const config = { keywords: ['urgent', 'sale', 'meeting'] };
    expect(handler.evaluate(notification, config)).toBe(true);
  });

  it('does not match when no keywords found', () => {
    const notification = createNotification({ title: 'Hello world', content: 'Just a test' });
    const config = { keywords: ['urgent', 'sale'] };
    expect(handler.evaluate(notification, config)).toBe(false);
  });

  it('handles null title and content', () => {
    const notification = createNotification({ title: null, content: null });
    const config = { keywords: ['urgent'] };
    expect(handler.evaluate(notification, config)).toBe(false);
  });

  it('returns false for empty keywords array', () => {
    const notification = createNotification();
    const config = { keywords: [] };
    expect(handler.evaluate(notification, config)).toBe(false);
  });

  it('returns false for missing keywords config', () => {
    const notification = createNotification();
    expect(handler.evaluate(notification, {})).toBe(false);
  });
});

describe('ContactTriggerHandler', () => {
  const handler = new ContactTriggerHandler();

  it('matches when sender is in contacts array', () => {
    const notification = createNotification({ sender: 'John Doe' });
    const config = { contacts: ['John Doe', 'Jane Smith'] };
    expect(handler.evaluate(notification, config)).toBe(true);
  });

  it('matches case-insensitively', () => {
    const notification = createNotification({ sender: 'john doe' });
    const config = { contacts: ['John Doe'] };
    expect(handler.evaluate(notification, config)).toBe(true);
  });

  it('does not match when sender is not in contacts', () => {
    const notification = createNotification({ sender: 'Bob' });
    const config = { contacts: ['John Doe', 'Jane Smith'] };
    expect(handler.evaluate(notification, config)).toBe(false);
  });

  it('returns false when sender is null', () => {
    const notification = createNotification({ sender: null });
    const config = { contacts: ['John Doe'] };
    expect(handler.evaluate(notification, config)).toBe(false);
  });

  it('returns false for empty contacts array', () => {
    const notification = createNotification({ sender: 'John' });
    const config = { contacts: [] };
    expect(handler.evaluate(notification, config)).toBe(false);
  });

  it('returns false for missing contacts config', () => {
    const notification = createNotification();
    expect(handler.evaluate(notification, {})).toBe(false);
  });
});

describe('TimeTriggerHandler', () => {
  const handler = new TimeTriggerHandler();

  it('matches when time is within normal window', () => {
    const notification = createNotification({
      receivedAt: new Date('2024-01-15T10:30:00'),
    });
    const config = { startTime: '09:00', endTime: '17:00' };
    expect(handler.evaluate(notification, config)).toBe(true);
  });

  it('does not match when time is outside normal window', () => {
    const notification = createNotification({
      receivedAt: new Date('2024-01-15T20:00:00'),
    });
    const config = { startTime: '09:00', endTime: '17:00' };
    expect(handler.evaluate(notification, config)).toBe(false);
  });

  it('matches at exact start time', () => {
    const notification = createNotification({
      receivedAt: new Date('2024-01-15T09:00:00'),
    });
    const config = { startTime: '09:00', endTime: '17:00' };
    expect(handler.evaluate(notification, config)).toBe(true);
  });

  it('matches at exact end time', () => {
    const notification = createNotification({
      receivedAt: new Date('2024-01-15T17:00:00'),
    });
    const config = { startTime: '09:00', endTime: '17:00' };
    expect(handler.evaluate(notification, config)).toBe(true);
  });

  it('handles overnight window (e.g., 22:00 to 06:00)', () => {
    const notification = createNotification({
      receivedAt: new Date('2024-01-15T23:30:00'),
    });
    const config = { startTime: '22:00', endTime: '06:00' };
    expect(handler.evaluate(notification, config)).toBe(true);
  });

  it('handles overnight window - early morning', () => {
    const notification = createNotification({
      receivedAt: new Date('2024-01-15T03:00:00'),
    });
    const config = { startTime: '22:00', endTime: '06:00' };
    expect(handler.evaluate(notification, config)).toBe(true);
  });

  it('does not match outside overnight window', () => {
    const notification = createNotification({
      receivedAt: new Date('2024-01-15T12:00:00'),
    });
    const config = { startTime: '22:00', endTime: '06:00' };
    expect(handler.evaluate(notification, config)).toBe(false);
  });

  it('returns false for invalid time format', () => {
    const notification = createNotification();
    const config = { startTime: 'invalid', endTime: '17:00' };
    expect(handler.evaluate(notification, config)).toBe(false);
  });

  it('returns false for missing startTime', () => {
    const notification = createNotification();
    const config = { endTime: '17:00' };
    expect(handler.evaluate(notification, config as any)).toBe(false);
  });

  it('returns false for missing endTime', () => {
    const notification = createNotification();
    const config = { startTime: '09:00' };
    expect(handler.evaluate(notification, config as any)).toBe(false);
  });
});

describe('LocationTriggerHandler', () => {
  const handler = new LocationTriggerHandler();

  it('always returns true (placeholder)', () => {
    const notification = createNotification();
    expect(handler.evaluate(notification, {})).toBe(true);
  });

  it('returns true regardless of config', () => {
    const notification = createNotification();
    const config = { latitude: 40.7128, longitude: -74.006, radius: 1000 };
    expect(handler.evaluate(notification, config)).toBe(true);
  });
});

describe('FrequencyTriggerHandler', () => {
  const handler = new FrequencyTriggerHandler();

  it('always returns true (placeholder)', () => {
    const notification = createNotification();
    expect(handler.evaluate(notification, {})).toBe(true);
  });

  it('returns true regardless of config', () => {
    const notification = createNotification();
    const config = { maxCount: 5, timeWindowMinutes: 60 };
    expect(handler.evaluate(notification, config)).toBe(true);
  });
});

describe('Trigger Registry', () => {
  it('has all 6 trigger types registered', () => {
    expect(triggerRegistry.size).toBe(6);
  });

  it('returns handler for app trigger', () => {
    expect(getTriggerHandler('app')).toBeInstanceOf(AppTriggerHandler);
  });

  it('returns handler for keyword trigger', () => {
    expect(getTriggerHandler('keyword')).toBeInstanceOf(KeywordTriggerHandler);
  });

  it('returns handler for contact trigger', () => {
    expect(getTriggerHandler('contact')).toBeInstanceOf(ContactTriggerHandler);
  });

  it('returns handler for time trigger', () => {
    expect(getTriggerHandler('time')).toBeInstanceOf(TimeTriggerHandler);
  });

  it('returns handler for location trigger', () => {
    expect(getTriggerHandler('location')).toBeInstanceOf(LocationTriggerHandler);
  });

  it('returns handler for frequency trigger', () => {
    expect(getTriggerHandler('frequency')).toBeInstanceOf(FrequencyTriggerHandler);
  });

  it('returns undefined for unknown trigger type', () => {
    expect(getTriggerHandler('unknown' as any)).toBeUndefined();
  });
});
