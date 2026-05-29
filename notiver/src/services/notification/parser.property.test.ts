import fc from 'fast-check';
import { parseNotification, type ParsedNotification } from './parser';
import type { RawNotification } from '../../native/notification-listener/types';

/**
 * Property-Based Test: Notification Parsing Extracts All Fields
 *
 * Generates arbitrary raw notification payloads with all field combinations
 * and verifies all specified fields are correctly extracted and typed.
 *
 * **Validates: Requirements 5.2**
 */

// --- Custom Arbitraries ---

/** Arbitrary for nullable string fields (title, content, sender) */
const nullableStringArb = fc.oneof(
  fc.constant(null),
  fc.string({ minLength: 0, maxLength: 1000 })
);

/** Arbitrary for package name (e.g., com.example.app) */
const packageNameArb = fc.stringMatching(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){1,5}$/);

/** Arbitrary for app name */
const appNameArb = fc.string({ minLength: 1, maxLength: 100 });

/** Arbitrary for valid Unix timestamps in ms (positive finite numbers) */
const timestampArb = fc.oneof(
  fc.integer({ min: 1, max: 2000000000000 }), // valid timestamps
  fc.constant(0), // edge: zero
  fc.constant(-1), // edge: negative
  fc.constant(NaN), // edge: NaN
  fc.constant(Infinity) // edge: Infinity
);

/** Arbitrary for priority values */
const priorityArb = fc.oneof(
  fc.integer({ min: -10, max: 10 }), // normal integers
  fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }), // floats
  fc.constant(NaN),
  fc.constant(Infinity),
  fc.constant(-Infinity)
);

/** Arbitrary for notification extras */
const extrasArb = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }),
  fc.oneof(
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.constant(null)
  )
);

/** Full arbitrary for RawNotification */
const rawNotificationArb: fc.Arbitrary<RawNotification> = fc.record({
  key: fc.string({ minLength: 1, maxLength: 100 }),
  packageName: fc.oneof(packageNameArb, fc.string({ minLength: 0, maxLength: 300 })),
  appName: fc.oneof(appNameArb, fc.string({ minLength: 0, maxLength: 300 })),
  title: nullableStringArb,
  content: nullableStringArb,
  sender: nullableStringArb,
  timestamp: timestampArb,
  priority: priorityArb,
  extras: extrasArb,
});

// --- Property Tests ---

describe('Property 2: Notification Parsing Extracts All Fields', () => {
  it('always produces a ParsedNotification with all required fields defined', () => {
    fc.assert(
      fc.property(rawNotificationArb, (raw) => {
        const result = parseNotification(raw);

        // All fields must be defined (not undefined)
        expect(result.id).toBeDefined();
        expect(result.packageName).toBeDefined();
        expect(result.appName).toBeDefined();
        expect(result.priority).toBeDefined();
        expect(result.isRead).toBeDefined();
        expect(result.isArchived).toBeDefined();
        expect(result.receivedAt).toBeDefined();
        expect(result.createdAt).toBeDefined();
        // Nullable fields must be explicitly null or a value (not undefined)
        expect(result.title === null || typeof result.title === 'string').toBe(true);
        expect(result.content === null || typeof result.content === 'string').toBe(true);
        expect(result.sender === null || typeof result.sender === 'string').toBe(true);
        expect(result.rawData === null || typeof result.rawData === 'string').toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('id is always a valid UUID v4 string', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

    fc.assert(
      fc.property(rawNotificationArb, (raw) => {
        const result = parseNotification(raw);
        expect(result.id).toMatch(uuidRegex);
      }),
      { numRuns: 200 }
    );
  });

  it('packageName is always a non-empty string', () => {
    fc.assert(
      fc.property(rawNotificationArb, (raw) => {
        const result = parseNotification(raw);
        expect(typeof result.packageName).toBe('string');
        expect(result.packageName.length).toBeGreaterThan(0);
      }),
      { numRuns: 200 }
    );
  });

  it('appName is always a non-empty string', () => {
    fc.assert(
      fc.property(rawNotificationArb, (raw) => {
        const result = parseNotification(raw);
        expect(typeof result.appName).toBe('string');
        expect(result.appName.length).toBeGreaterThan(0);
      }),
      { numRuns: 200 }
    );
  });

  it('priority is always a finite integer', () => {
    fc.assert(
      fc.property(rawNotificationArb, (raw) => {
        const result = parseNotification(raw);
        expect(typeof result.priority).toBe('number');
        expect(Number.isFinite(result.priority)).toBe(true);
        expect(Number.isInteger(result.priority)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('receivedAt is always a valid Date', () => {
    fc.assert(
      fc.property(rawNotificationArb, (raw) => {
        const result = parseNotification(raw);
        expect(result.receivedAt).toBeInstanceOf(Date);
        expect(Number.isNaN(result.receivedAt.getTime())).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it('createdAt is always a valid Date', () => {
    fc.assert(
      fc.property(rawNotificationArb, (raw) => {
        const result = parseNotification(raw);
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(Number.isNaN(result.createdAt.getTime())).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it('isRead is always false for newly parsed notifications', () => {
    fc.assert(
      fc.property(rawNotificationArb, (raw) => {
        const result = parseNotification(raw);
        expect(result.isRead).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it('isArchived is always false for newly parsed notifications', () => {
    fc.assert(
      fc.property(rawNotificationArb, (raw) => {
        const result = parseNotification(raw);
        expect(result.isArchived).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it('non-empty trimmed string fields from raw are preserved in parsed output', () => {
    // Use a more constrained arbitrary that always has valid non-empty strings
    const validRawArb = fc.record({
      key: fc.string({ minLength: 1, maxLength: 50 }),
      packageName: packageNameArb,
      appName: fc.string({ minLength: 1, maxLength: 100 }),
      title: fc.string({ minLength: 1, maxLength: 200 }),
      content: fc.string({ minLength: 1, maxLength: 200 }),
      sender: fc.string({ minLength: 1, maxLength: 100 }),
      timestamp: fc.integer({ min: 1, max: 2000000000000 }),
      priority: fc.integer({ min: -5, max: 5 }),
      extras: extrasArb,
    });

    fc.assert(
      fc.property(validRawArb, (raw) => {
        const result = parseNotification(raw);

        // packageName should match (trimmed) or fallback to 'unknown'
        const trimmedPkg = raw.packageName.trim();
        if (trimmedPkg.length > 0) {
          expect(result.packageName).toBe(trimmedPkg.slice(0, 256));
        }

        // appName should match (trimmed) or fallback to 'Unknown App'
        const trimmedApp = raw.appName.trim();
        if (trimmedApp.length > 0) {
          expect(result.appName).toBe(trimmedApp.slice(0, 256));
        }

        // title should be trimmed version (non-empty after trim)
        const trimmedTitle = raw.title.trim();
        if (trimmedTitle.length > 0) {
          expect(result.title).toBe(trimmedTitle.slice(0, 500));
        }

        // content should be trimmed version (non-empty after trim)
        const trimmedContent = raw.content.trim();
        if (trimmedContent.length > 0) {
          expect(result.content).toBe(trimmedContent.slice(0, 5000));
        }

        // sender should be trimmed version (non-empty after trim)
        const trimmedSender = raw.sender.trim();
        if (trimmedSender.length > 0) {
          expect(result.sender).toBe(trimmedSender.slice(0, 200));
        }

        // priority should be truncated integer
        expect(result.priority).toBe(Math.trunc(raw.priority));

        // receivedAt should match the timestamp
        expect(result.receivedAt).toEqual(new Date(raw.timestamp));
      }),
      { numRuns: 200 }
    );
  });

  it('string fields are always truncated within maximum lengths', () => {
    // Generate very long strings to test truncation
    const longStringRawArb = fc.record({
      key: fc.string({ minLength: 1, maxLength: 50 }),
      packageName: fc.string({ minLength: 1, maxLength: 1000 }),
      appName: fc.string({ minLength: 1, maxLength: 1000 }),
      title: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 2000 })),
      content: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 10000 })),
      sender: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 1000 })),
      timestamp: fc.integer({ min: 1, max: 2000000000000 }),
      priority: fc.integer({ min: -5, max: 5 }),
      extras: extrasArb,
    });

    fc.assert(
      fc.property(longStringRawArb, (raw) => {
        const result = parseNotification(raw);

        expect(result.packageName.length).toBeLessThanOrEqual(256);
        expect(result.appName.length).toBeLessThanOrEqual(256);
        if (result.title !== null) {
          expect(result.title.length).toBeLessThanOrEqual(500);
        }
        if (result.content !== null) {
          expect(result.content.length).toBeLessThanOrEqual(5000);
        }
        if (result.sender !== null) {
          expect(result.sender.length).toBeLessThanOrEqual(200);
        }
      }),
      { numRuns: 200 }
    );
  });
});
