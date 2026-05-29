import fc from 'fast-check';
import type { FocusSessionStatus, FocusPreset } from './types';
import { VALID_TRANSITIONS } from './types';

/**
 * Property-Based Tests for Focus Engine
 *
 * Property 10: Focus Session State Machine Transitions
 * Property 11: Focus Mode Notification Blocking
 *
 * **Validates: Requirements 11.2, 11.4**
 */

// --- Mocks ---

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockFindActive = jest.fn();
const mockFindById = jest.fn();

jest.mock('../../../database/repositories', () => ({
  focusSessionRepository: {
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    findActive: (...args: unknown[]) => mockFindActive(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
  },
}));

const mockEmit = jest.fn();

jest.mock('../../../services/event-bus', () => ({
  eventBus: {
    emit: (...args: unknown[]) => mockEmit(...args),
  },
  AppEvents: {
    FOCUS_SESSION_STARTED: 'focus:session_started',
    FOCUS_SESSION_ENDED: 'focus:session_ended',
    FOCUS_SESSION_PAUSED: 'focus:session_paused',
    FOCUS_SESSION_RESUMED: 'focus:session_resumed',
    FOCUS_NOTIFICATION_BLOCKED: 'focus:notification_blocked',
  },
}));

import { FocusEngine } from './engine';

// --- Custom Arbitraries ---

const ALL_STATUSES: FocusSessionStatus[] = ['active', 'paused', 'completed', 'cancelled'];
const ALL_PRESETS: FocusPreset[] = ['study', 'work', 'sleep', 'meeting', 'custom'];

const focusStatusArb = fc.constantFrom(...ALL_STATUSES);
const focusPresetArb = fc.constantFrom(...ALL_PRESETS);

/** Arbitrary for a valid Android package name */
const packageNameArb = fc.stringMatching(/^com\.[a-z]{1,10}\.[a-z]{1,10}$/);

/** Arbitrary for a list of unique package names */
const packageListArb = fc.uniqueArray(packageNameArb, { minLength: 0, maxLength: 10 });

/** Arbitrary for a target transition status */
const targetStatusArb = fc.constantFrom(...ALL_STATUSES);

// --- Helpers ---

function makeDbSession(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'session-1',
    preset: 'work',
    status: 'active',
    startedAt: new Date('2024-01-15T10:00:00Z'),
    endedAt: null,
    plannedDurationMin: 60,
    actualDurationMin: null,
    blockedCount: 0,
    interruptionCount: 0,
    blockedApps: JSON.stringify([]),
    allowedApps: JSON.stringify([]),
    ...overrides,
  };
}

/**
 * Maps a transition attempt to the engine method that performs it.
 */
function getTransitionMethod(targetStatus: FocusSessionStatus): string {
  switch (targetStatus) {
    case 'paused':
      return 'pauseSession';
    case 'active':
      return 'resumeSession';
    case 'completed':
    case 'cancelled':
      return 'endSession';
    default:
      return 'endSession';
  }
}

// --- Property 10: Focus Session State Machine Transitions ---

describe('Property 10: Focus Session State Machine Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindActive.mockResolvedValue([]);
    mockCreate.mockImplementation(async (entity: Record<string, unknown>) => ({
      id: 'session-1',
      ...entity,
    }));
    mockUpdate.mockResolvedValue(undefined);
    mockFindById.mockResolvedValue(null);
  });

  it('valid transitions succeed without error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          ...([
            { from: 'active', to: 'paused' },
            { from: 'active', to: 'completed' },
            { from: 'active', to: 'cancelled' },
            { from: 'paused', to: 'active' },
            { from: 'paused', to: 'completed' },
            { from: 'paused', to: 'cancelled' },
          ] as { from: FocusSessionStatus; to: FocusSessionStatus }[])
        ),
        focusPresetArb,
        async (transition, preset) => {
          const engine = new FocusEngine();

          // Set up the engine with a session in the 'from' state
          const startTime = new Date(Date.now() - 5 * 60 * 1000);
          const dbSession = makeDbSession({
            id: 'session-1',
            preset,
            status: 'active',
            startedAt: startTime,
            plannedDurationMin: 60,
          });
          mockCreate.mockResolvedValue(dbSession);
          mockFindActive.mockResolvedValue([]);

          // Start a session (always starts as active)
          await engine.startSession(preset, {
            durationMin: 60,
            blockedApps: [],
            allowedApps: [],
          });

          // If we need to start from 'paused', pause first
          if (transition.from === 'paused') {
            await engine.pauseSession('session-1');
          }

          // Now attempt the target transition
          const method = getTransitionMethod(transition.to);

          // Should NOT throw
          await expect(
            (engine as unknown as Record<string, (id: string) => Promise<unknown>>)[method]('session-1')
          ).resolves.not.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('invalid transitions are rejected without state modification', async () => {
    // All invalid transitions: transitions NOT in the VALID_TRANSITIONS map
    const invalidTransitions: { from: FocusSessionStatus; to: FocusSessionStatus }[] = [];
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        if (!VALID_TRANSITIONS[from].includes(to)) {
          invalidTransitions.push({ from, to });
        }
      }
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...invalidTransitions),
        focusPresetArb,
        async (transition, preset) => {
          const engine = new FocusEngine();

          // For terminal states (completed, cancelled), we use findById to simulate
          if (transition.from === 'completed' || transition.from === 'cancelled') {
            mockFindById.mockResolvedValue(
              makeDbSession({ id: 'session-1', preset, status: transition.from })
            );
            mockFindActive.mockResolvedValue([]);

            const method = getTransitionMethod(transition.to);

            await expect(
              (engine as unknown as Record<string, (id: string) => Promise<unknown>>)[method]('session-1')
            ).rejects.toThrow(/Invalid state transition/);
          } else {
            // For active/paused states, set up a live session
            const startTime = new Date(Date.now() - 5 * 60 * 1000);
            const dbSession = makeDbSession({
              id: 'session-1',
              preset,
              status: 'active',
              startedAt: startTime,
              plannedDurationMin: 60,
            });
            mockCreate.mockResolvedValue(dbSession);
            mockFindActive.mockResolvedValue([]);

            await engine.startSession(preset, {
              durationMin: 60,
              blockedApps: [],
              allowedApps: [],
            });

            // If we need to start from 'paused', pause first
            if (transition.from === 'paused') {
              await engine.pauseSession('session-1');
            }

            // Capture state before invalid transition attempt
            const stateBefore = engine.getCurrentSession()?.status;

            const method = getTransitionMethod(transition.to);

            await expect(
              (engine as unknown as Record<string, (id: string) => Promise<unknown>>)[method]('session-1')
            ).rejects.toThrow(/Invalid state transition/);

            // State should remain unchanged after rejected transition
            expect(engine.getCurrentSession()?.status).toBe(stateBefore);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

// --- Property 11: Focus Mode Notification Blocking ---

describe('Property 11: Focus Mode Notification Blocking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindActive.mockResolvedValue([]);
    mockCreate.mockImplementation(async (entity: Record<string, unknown>) => ({
      id: 'session-1',
      ...entity,
    }));
    mockUpdate.mockResolvedValue(undefined);
    mockFindById.mockResolvedValue(null);
  });

  it('notifications from blocked apps are suppressed during active sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        packageListArb.filter((list) => list.length >= 1),
        packageListArb,
        focusPresetArb,
        async (blockedApps, allowedApps, preset) => {
          // Ensure no overlap between blocked and allowed for this test
          const filteredAllowed = allowedApps.filter((app) => !blockedApps.includes(app));

          const engine = new FocusEngine();

          const dbSession = makeDbSession({
            id: 'session-1',
            preset,
            status: 'active',
            blockedApps: JSON.stringify(blockedApps),
            allowedApps: JSON.stringify(filteredAllowed),
          });
          mockCreate.mockResolvedValue(dbSession);
          mockFindActive.mockResolvedValue([]);

          await engine.startSession(preset, {
            durationMin: 60,
            blockedApps,
            allowedApps: filteredAllowed,
          });

          // Every blocked app should be suppressed
          for (const app of blockedApps) {
            expect(engine.isBlocked(app)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('notifications from non-blocked apps pass through', async () => {
    await fc.assert(
      fc.asyncProperty(
        packageListArb.filter((list) => list.length >= 1),
        packageNameArb,
        focusPresetArb,
        async (blockedApps, incomingApp, preset) => {
          // Ensure the incoming app is NOT in the blocked list
          fc.pre(!blockedApps.includes(incomingApp));

          const engine = new FocusEngine();

          const dbSession = makeDbSession({
            id: 'session-1',
            preset,
            status: 'active',
            blockedApps: JSON.stringify(blockedApps),
            allowedApps: JSON.stringify([]),
          });
          mockCreate.mockResolvedValue(dbSession);
          mockFindActive.mockResolvedValue([]);

          await engine.startSession(preset, {
            durationMin: 60,
            blockedApps,
            allowedApps: [],
          });

          // Non-blocked app should pass through
          expect(engine.isBlocked(incomingApp)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allowed apps override blocked apps (whitelist takes precedence)', async () => {
    await fc.assert(
      fc.asyncProperty(
        packageListArb.filter((list) => list.length >= 1),
        focusPresetArb,
        async (apps, preset) => {
          // Put the same apps in both blocked and allowed lists
          const engine = new FocusEngine();

          const dbSession = makeDbSession({
            id: 'session-1',
            preset,
            status: 'active',
            blockedApps: JSON.stringify(apps),
            allowedApps: JSON.stringify(apps), // same apps in whitelist
          });
          mockCreate.mockResolvedValue(dbSession);
          mockFindActive.mockResolvedValue([]);

          await engine.startSession(preset, {
            durationMin: 60,
            blockedApps: apps,
            allowedApps: apps,
          });

          // Whitelist overrides blocklist — none should be blocked
          for (const app of apps) {
            expect(engine.isBlocked(app)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no notifications are blocked when no session is active', async () => {
    await fc.assert(
      fc.asyncProperty(packageNameArb, async (packageName) => {
        const engine = new FocusEngine();

        // No session started — nothing should be blocked
        expect(engine.isBlocked(packageName)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
