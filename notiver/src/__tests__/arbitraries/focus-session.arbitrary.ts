import * as fc from 'fast-check';
import type { FocusPreset, FocusSessionStatus } from '../../database/schema/focus-sessions';

const FOCUS_PRESETS: FocusPreset[] = ['study', 'work', 'sleep', 'meeting', 'custom'];
const FOCUS_STATUSES: FocusSessionStatus[] = ['active', 'paused', 'completed', 'cancelled'];

/**
 * Arbitrary for generating valid FocusSession entities (without id which is auto-generated).
 */
export const focusSessionArbitrary = fc.record({
  preset: fc.constantFrom(...FOCUS_PRESETS),
  status: fc.constantFrom(...FOCUS_STATUSES),
  startedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  endedAt: fc.option(
    fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
    { nil: null }
  ),
  plannedDurationMin: fc.integer({ min: 1, max: 480 }),
  actualDurationMin: fc.option(fc.integer({ min: 0, max: 480 }), { nil: null }),
  blockedCount: fc.integer({ min: 0, max: 1000 }),
  interruptionCount: fc.integer({ min: 0, max: 100 }),
  blockedApps: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }).map((apps) =>
      JSON.stringify(apps)
    ),
    { nil: null }
  ),
  allowedApps: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }).map((apps) =>
      JSON.stringify(apps)
    ),
    { nil: null }
  ),
});

/**
 * Arbitrary for generating partial focus session updates.
 */
export const focusSessionUpdateArbitrary = fc.record({
  status: fc.option(fc.constantFrom(...FOCUS_STATUSES), { nil: undefined }),
  actualDurationMin: fc.option(fc.integer({ min: 0, max: 480 }), { nil: undefined }),
  blockedCount: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
  interruptionCount: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
}).filter((update) => Object.values(update).some((v) => v !== undefined));
