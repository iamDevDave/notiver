import type { FocusSession } from './types';

// Mock the database repository
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

// Mock the event bus
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
    blockedApps: JSON.stringify(['com.social.app', 'com.game.app']),
    allowedApps: JSON.stringify(['com.phone.app']),
    ...overrides,
  };
}

describe('FocusEngine', () => {
  let engine: FocusEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new FocusEngine();

    // Default mocks
    mockFindActive.mockResolvedValue([]);
    mockCreate.mockImplementation(async (entity: Record<string, unknown>) => ({
      id: 'session-new',
      ...entity,
    }));
    mockUpdate.mockResolvedValue(undefined);
    mockFindById.mockResolvedValue(null);
  });

  describe('startSession()', () => {
    it('creates a new session with correct fields', async () => {
      const session = await engine.startSession('work', {
        durationMin: 60,
        blockedApps: ['com.social.app'],
        allowedApps: ['com.phone.app'],
      });

      expect(session.preset).toBe('work');
      expect(session.status).toBe('active');
      expect(session.plannedDurationMin).toBe(60);
      expect(session.blockedApps).toEqual(['com.social.app']);
      expect(session.allowedApps).toEqual(['com.phone.app']);
      expect(session.blockedCount).toBe(0);
      expect(session.interruptionCount).toBe(0);
    });

    it('persists the session to the database', async () => {
      await engine.startSession('study', {
        durationMin: 45,
        blockedApps: ['com.game.app'],
        allowedApps: [],
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          preset: 'study',
          status: 'active',
          plannedDurationMin: 45,
          blockedApps: JSON.stringify(['com.game.app']),
          allowedApps: JSON.stringify([]),
        })
      );
    });

    it('emits focus:session_started event', async () => {
      await engine.startSession('meeting', {
        durationMin: 30,
        blockedApps: [],
        allowedApps: [],
      });

      expect(mockEmit).toHaveBeenCalledWith('focus:session_started', {
        sessionId: expect.any(String),
        preset: 'meeting',
      });
    });

    it('throws if a session is already active in memory', async () => {
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      await expect(
        engine.startSession('study', {
          durationMin: 30,
          blockedApps: [],
          allowedApps: [],
        })
      ).rejects.toThrow(/Cannot start a new session/);
    });

    it('throws if a session is already active in database', async () => {
      mockFindActive.mockResolvedValue([makeDbSession()]);

      await expect(
        engine.startSession('work', {
          durationMin: 60,
          blockedApps: [],
          allowedApps: [],
        })
      ).rejects.toThrow(/Cannot start a new session/);
    });

    it('supports all preset types', async () => {
      const presets = ['study', 'work', 'sleep', 'meeting', 'custom'] as const;

      for (const preset of presets) {
        const freshEngine = new FocusEngine();
        mockFindActive.mockResolvedValue([]);

        const session = await freshEngine.startSession(preset, {
          durationMin: 30,
          blockedApps: [],
          allowedApps: [],
        });

        expect(session.preset).toBe(preset);
      }
    });
  });

  describe('pauseSession()', () => {
    it('transitions an active session to paused', async () => {
      mockCreate.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'active' }));
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      await engine.pauseSession('session-1');

      expect(mockUpdate).toHaveBeenCalledWith('session-1', { status: 'paused' });
      expect(engine.getCurrentSession()?.status).toBe('paused');
    });

    it('emits focus:session_paused event', async () => {
      mockCreate.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'active' }));
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      await engine.pauseSession('session-1');

      expect(mockEmit).toHaveBeenCalledWith('focus:session_paused', {
        sessionId: 'session-1',
      });
    });

    it('throws if session is already paused', async () => {
      mockCreate.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'active' }));
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      await engine.pauseSession('session-1');

      await expect(engine.pauseSession('session-1')).rejects.toThrow(
        /Invalid state transition/
      );
    });

    it('throws if session is not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(engine.pauseSession('nonexistent')).rejects.toThrow(
        /Focus session not found/
      );
    });
  });

  describe('resumeSession()', () => {
    it('transitions a paused session back to active', async () => {
      mockCreate.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'active' }));
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      await engine.pauseSession('session-1');
      await engine.resumeSession('session-1');

      expect(mockUpdate).toHaveBeenCalledWith('session-1', { status: 'active' });
      expect(engine.getCurrentSession()?.status).toBe('active');
    });

    it('emits focus:session_resumed event', async () => {
      mockCreate.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'active' }));
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      await engine.pauseSession('session-1');
      await engine.resumeSession('session-1');

      expect(mockEmit).toHaveBeenCalledWith('focus:session_resumed', {
        sessionId: 'session-1',
      });
    });

    it('throws if session is active (not paused)', async () => {
      mockCreate.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'active' }));
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      await expect(engine.resumeSession('session-1')).rejects.toThrow(
        /Invalid state transition/
      );
    });
  });

  describe('endSession()', () => {
    it('ends an active session and returns result', async () => {
      const startTime = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
      mockCreate.mockResolvedValue(
        makeDbSession({ id: 'session-1', status: 'active', startedAt: startTime, plannedDurationMin: 25 })
      );
      await engine.startSession('work', {
        durationMin: 25,
        blockedApps: [],
        allowedApps: [],
      });

      const result = await engine.endSession('session-1');

      expect(result.sessionId).toBe('session-1');
      expect(result.preset).toBe('work');
      expect(result.status).toBe('completed'); // 30 min >= 25 min planned
      expect(result.durationMin).toBeGreaterThanOrEqual(25);
    });

    it('marks as cancelled if ended before planned duration', async () => {
      const startTime = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
      mockCreate.mockResolvedValue(
        makeDbSession({ id: 'session-1', status: 'active', startedAt: startTime, plannedDurationMin: 60 })
      );
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      const result = await engine.endSession('session-1');

      expect(result.status).toBe('cancelled'); // 5 min < 60 min planned
    });

    it('persists endedAt and actualDurationMin', async () => {
      const startTime = new Date(Date.now() - 10 * 60 * 1000);
      mockCreate.mockResolvedValue(
        makeDbSession({ id: 'session-1', status: 'active', startedAt: startTime })
      );
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      await engine.endSession('session-1');

      expect(mockUpdate).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({
          status: expect.any(String),
          endedAt: expect.any(Date),
          actualDurationMin: expect.any(Number),
        })
      );
    });

    it('emits focus:session_ended event with result', async () => {
      const startTime = new Date(Date.now() - 10 * 60 * 1000);
      mockCreate.mockResolvedValue(
        makeDbSession({ id: 'session-1', status: 'active', startedAt: startTime })
      );
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      await engine.endSession('session-1');

      expect(mockEmit).toHaveBeenCalledWith(
        'focus:session_ended',
        expect.objectContaining({
          sessionId: 'session-1',
          preset: 'work',
          status: expect.any(String),
          durationMin: expect.any(Number),
        })
      );
    });

    it('clears the current session after ending', async () => {
      mockCreate.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'active' }));
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      await engine.endSession('session-1');

      expect(engine.getCurrentSession()).toBeNull();
    });

    it('throws if session is already completed', async () => {
      mockFindById.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'completed' }));

      await expect(engine.endSession('session-1')).rejects.toThrow(
        /Invalid state transition/
      );
    });

    it('can end a paused session', async () => {
      const startTime = new Date(Date.now() - 10 * 60 * 1000);
      mockCreate.mockResolvedValue(
        makeDbSession({ id: 'session-1', status: 'active', startedAt: startTime })
      );
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      await engine.pauseSession('session-1');
      const result = await engine.endSession('session-1');

      expect(result.sessionId).toBe('session-1');
    });
  });

  describe('isBlocked()', () => {
    it('returns false when no session is active', () => {
      expect(engine.isBlocked('com.social.app')).toBe(false);
    });

    it('returns true for apps in the blocked list', async () => {
      mockCreate.mockResolvedValue(
        makeDbSession({
          id: 'session-1',
          status: 'active',
          blockedApps: JSON.stringify(['com.social.app', 'com.game.app']),
          allowedApps: JSON.stringify([]),
        })
      );
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: ['com.social.app', 'com.game.app'],
        allowedApps: [],
      });

      expect(engine.isBlocked('com.social.app')).toBe(true);
      expect(engine.isBlocked('com.game.app')).toBe(true);
    });

    it('returns false for apps not in the blocked list', async () => {
      mockCreate.mockResolvedValue(
        makeDbSession({
          id: 'session-1',
          status: 'active',
          blockedApps: JSON.stringify(['com.social.app']),
          allowedApps: JSON.stringify([]),
        })
      );
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: ['com.social.app'],
        allowedApps: [],
      });

      expect(engine.isBlocked('com.other.app')).toBe(false);
    });

    it('whitelist overrides blocklist', async () => {
      mockCreate.mockResolvedValue(
        makeDbSession({
          id: 'session-1',
          status: 'active',
          blockedApps: JSON.stringify(['com.social.app']),
          allowedApps: JSON.stringify(['com.social.app']),
        })
      );
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: ['com.social.app'],
        allowedApps: ['com.social.app'],
      });

      // Allowed overrides blocked
      expect(engine.isBlocked('com.social.app')).toBe(false);
    });

    it('blocks during paused sessions too', async () => {
      mockCreate.mockResolvedValue(
        makeDbSession({
          id: 'session-1',
          status: 'active',
          blockedApps: JSON.stringify(['com.social.app']),
          allowedApps: JSON.stringify([]),
        })
      );
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: ['com.social.app'],
        allowedApps: [],
      });

      await engine.pauseSession('session-1');

      expect(engine.isBlocked('com.social.app')).toBe(true);
    });

    it('does not block after session ends', async () => {
      mockCreate.mockResolvedValue(
        makeDbSession({
          id: 'session-1',
          status: 'active',
          blockedApps: JSON.stringify(['com.social.app']),
          allowedApps: JSON.stringify([]),
        })
      );
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: ['com.social.app'],
        allowedApps: [],
      });

      await engine.endSession('session-1');

      expect(engine.isBlocked('com.social.app')).toBe(false);
    });
  });

  describe('incrementBlockedCount()', () => {
    it('increments the blocked count and persists', async () => {
      mockCreate.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'active' }));
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: ['com.social.app'],
        allowedApps: [],
      });

      await engine.incrementBlockedCount('session-1');

      expect(engine.getCurrentSession()?.blockedCount).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith('session-1', { blockedCount: 1 });
    });

    it('increments multiple times correctly', async () => {
      mockCreate.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'active' }));
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: ['com.social.app'],
        allowedApps: [],
      });

      await engine.incrementBlockedCount('session-1');
      await engine.incrementBlockedCount('session-1');
      await engine.incrementBlockedCount('session-1');

      expect(engine.getCurrentSession()?.blockedCount).toBe(3);
    });
  });

  describe('incrementInterruptionCount()', () => {
    it('increments the interruption count and persists', async () => {
      mockCreate.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'active' }));
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      await engine.incrementInterruptionCount('session-1');

      expect(engine.getCurrentSession()?.interruptionCount).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith('session-1', { interruptionCount: 1 });
    });
  });

  describe('hydrate()', () => {
    it('restores active session from database', async () => {
      mockFindActive.mockResolvedValue([makeDbSession({ id: 'session-db', status: 'active' })]);

      await engine.hydrate();

      expect(engine.getCurrentSession()).not.toBeNull();
      expect(engine.getCurrentSession()?.id).toBe('session-db');
      expect(engine.getCurrentSession()?.status).toBe('active');
    });

    it('sets null when no active session in database', async () => {
      mockFindActive.mockResolvedValue([]);

      await engine.hydrate();

      expect(engine.getCurrentSession()).toBeNull();
    });
  });

  describe('state machine validation', () => {
    it('rejects active → active transition (resume on active)', async () => {
      mockCreate.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'active' }));
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      await expect(engine.resumeSession('session-1')).rejects.toThrow(
        /Invalid state transition/
      );
    });

    it('rejects paused → paused transition', async () => {
      mockCreate.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'active' }));
      await engine.startSession('work', {
        durationMin: 60,
        blockedApps: [],
        allowedApps: [],
      });

      await engine.pauseSession('session-1');

      await expect(engine.pauseSession('session-1')).rejects.toThrow(
        /Invalid state transition/
      );
    });

    it('rejects transitions from completed state', async () => {
      mockFindById.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'completed' }));

      await expect(engine.pauseSession('session-1')).rejects.toThrow(
        /Invalid state transition/
      );
      await expect(engine.resumeSession('session-1')).rejects.toThrow(
        /Invalid state transition/
      );
      await expect(engine.endSession('session-1')).rejects.toThrow(
        /Invalid state transition/
      );
    });

    it('rejects transitions from cancelled state', async () => {
      mockFindById.mockResolvedValue(makeDbSession({ id: 'session-1', status: 'cancelled' }));

      await expect(engine.pauseSession('session-1')).rejects.toThrow(
        /Invalid state transition/
      );
      await expect(engine.resumeSession('session-1')).rejects.toThrow(
        /Invalid state transition/
      );
      await expect(engine.endSession('session-1')).rejects.toThrow(
        /Invalid state transition/
      );
    });
  });
});
