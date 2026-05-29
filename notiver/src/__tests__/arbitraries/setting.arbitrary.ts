import * as fc from 'fast-check';

/**
 * Arbitrary for generating valid Setting key-value pairs.
 */
export const settingArbitrary = fc.record({
  key: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => /^[a-zA-Z0-9._-]+$/.test(s)),
  value: fc.string({ minLength: 1, maxLength: 500 }),
});

/**
 * Arbitrary for generating updated setting values.
 */
export const settingValueArbitrary = fc.string({ minLength: 1, maxLength: 500 });
