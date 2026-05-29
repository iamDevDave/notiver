import * as fc from 'fast-check';
import type { TriggerType } from '../../database/schema/rules';

const TRIGGER_TYPES: TriggerType[] = [
  'app',
  'keyword',
  'contact',
  'time',
  'location',
  'frequency',
];

/**
 * Arbitrary for generating valid Rule entities (without id/createdAt which are auto-generated).
 */
export const ruleArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  description: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
  triggerType: fc.constantFrom(...TRIGGER_TYPES),
  triggerConfig: fc.json().map((j) => j),
  isActive: fc.boolean(),
  priority: fc.integer({ min: 0, max: 100 }),
  executionCount: fc.integer({ min: 0, max: 10000 }),
  lastTriggeredAt: fc.option(
    fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
    { nil: null }
  ),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
});

/**
 * Arbitrary for generating partial rule updates.
 */
export const ruleUpdateArbitrary = fc.record({
  name: fc.option(
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    { nil: undefined }
  ),
  description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  isActive: fc.option(fc.boolean(), { nil: undefined }),
  priority: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
}).filter((update) => Object.values(update).some((v) => v !== undefined));
