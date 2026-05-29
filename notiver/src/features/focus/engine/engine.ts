/**
 * Focus Engine implementation.
 *
 * Manages focus sessions with state machine validation, preset support,
 * and notification blocking logic. Persists session records via the
 * FocusSessionRepository and emits events on the event bus.
 *
 * State machine transitions:
 *   active → paused, completed, cancelled
 *   paused → active (resume), completed, cancelled
 *   completed → (terminal)
 *   cancelled → (terminal)
 */

import { focusSessionRepository } from '../../../database/repositories';
import { eventBus, AppEvents } from '../../../services/event-bus';
import type {
  IFocusEngine,
  FocusConfig,
  FocusSession,
  FocusSessionResult,
  FocusPreset,
  FocusSessionStatus,
} from './types';
import { VALID_TRANSITIONS } from './types';

export class FocusEngine implements IFocusEngine {
  /** In-memory reference to the current active/paused session for fast isBlocked() checks */
  private currentSession: FocusSession | null = null;

  /**
   * Start a new focus session with the given preset and configuration.
   *
   * @throws Error if there is already an active or paused session.
   */
  async startSession(preset: FocusPreset, config: FocusConfig): Promise<FocusSession> {
    // Ensure no active session exists
    if (this.currentSession) {
      throw new Error(
        `Cannot start a new session: a session is already ${this.currentSession.status} (id: ${this.currentSession.id})`
      );
    }

    // Also check the database for any active/paused sessions (in case of app restart)
    const activeSessions = await focusSessionRepository.findActive();
    if (activeSessions.length > 0) {
      // Hydrate in-memory state from DB
      const dbSession = activeSessions[0];
      this.currentSession = this.mapDbSession(dbSession);
      throw new Error(
        `Cannot start a new session: a session is already ${this.currentSession.status} (id: ${this.currentSession.id})`
      );
    }

    const now = new Date();

    const dbRecord = await focusSessionRepository.create({
      preset,
      status: 'active' as FocusSessionStatus,
      startedAt: now,
      endedAt: null,
      plannedDurationMin: config.durationMin,
      actualDurationMin: null,
      blockedCount: 0,
      interruptionCount: 0,
      blockedApps: JSON.stringify(config.blockedApps),
      allowedApps: JSON.stringify(config.allowedApps),
    });

    this.currentSession = this.mapDbSession(dbRecord);

    eventBus.emit(AppEvents.FOCUS_SESSION_STARTED, {
      sessionId: this.currentSession.id,
      preset,
    });

    return this.currentSession;
  }

  /**
   * Pause the active session.
   *
   * @throws Error if the session is not in 'active' state.
   */
  async pauseSession(sessionId: string): Promise<void> {
    const session = await this.getAndValidateSession(sessionId);
    this.validateTransition(session.status, 'paused');

    await focusSessionRepository.update(sessionId, { status: 'paused' });
    this.currentSession = { ...session, status: 'paused' };

    eventBus.emit(AppEvents.FOCUS_SESSION_PAUSED, { sessionId });
  }

  /**
   * Resume a paused session.
   *
   * @throws Error if the session is not in 'paused' state.
   */
  async resumeSession(sessionId: string): Promise<void> {
    const session = await this.getAndValidateSession(sessionId);
    this.validateTransition(session.status, 'active');

    await focusSessionRepository.update(sessionId, { status: 'active' });
    this.currentSession = { ...session, status: 'active' };

    eventBus.emit(AppEvents.FOCUS_SESSION_RESUMED, { sessionId });
  }

  /**
   * End the session (complete or cancel).
   * Calculates actual duration and persists the final session record.
   *
   * @throws Error if the session is already completed or cancelled.
   */
  async endSession(sessionId: string): Promise<FocusSessionResult> {
    const session = await this.getAndValidateSession(sessionId);
    this.validateTransition(session.status, 'completed');

    const now = new Date();
    const actualDurationMin = Math.round(
      (now.getTime() - session.startedAt.getTime()) / (1000 * 60)
    );

    // Determine if completed or cancelled based on whether planned duration was reached
    const status: 'completed' | 'cancelled' =
      actualDurationMin >= session.plannedDurationMin ? 'completed' : 'cancelled';

    await focusSessionRepository.update(sessionId, {
      status,
      endedAt: now,
      actualDurationMin,
    });

    const result: FocusSessionResult = {
      sessionId,
      preset: session.preset,
      status,
      durationMin: actualDurationMin,
      blockedCount: session.blockedCount,
      interruptionCount: session.interruptionCount,
    };

    // Clear in-memory session
    this.currentSession = null;

    eventBus.emit(AppEvents.FOCUS_SESSION_ENDED, result);

    return result;
  }

  /**
   * Check if a notification from the given package should be blocked.
   *
   * Blocking logic:
   * 1. If no active/paused session exists → not blocked
   * 2. If the package is in the allowedApps list → not blocked (whitelist overrides)
   * 3. If the package is in the blockedApps list → blocked
   * 4. Otherwise → not blocked (only explicitly blocked apps are suppressed)
   *
   * This is a synchronous check for performance (called on every notification).
   */
  isBlocked(packageName: string): boolean {
    if (!this.currentSession) {
      return false;
    }

    // Session must be active or paused to block
    if (this.currentSession.status !== 'active' && this.currentSession.status !== 'paused') {
      return false;
    }

    // Whitelist overrides blocklist
    if (this.currentSession.allowedApps.includes(packageName)) {
      return false;
    }

    // Check blocklist
    return this.currentSession.blockedApps.includes(packageName);
  }

  /**
   * Increment the blocked notification count for the current session.
   * Called externally when a notification is actually blocked.
   */
  async incrementBlockedCount(sessionId: string): Promise<void> {
    if (this.currentSession && this.currentSession.id === sessionId) {
      this.currentSession.blockedCount += 1;
      await focusSessionRepository.update(sessionId, {
        blockedCount: this.currentSession.blockedCount,
      });
    }
  }

  /**
   * Increment the interruption count for the current session.
   * Called when a notification from a non-blocked app arrives during focus.
   */
  async incrementInterruptionCount(sessionId: string): Promise<void> {
    if (this.currentSession && this.currentSession.id === sessionId) {
      this.currentSession.interruptionCount += 1;
      await focusSessionRepository.update(sessionId, {
        interruptionCount: this.currentSession.interruptionCount,
      });
    }
  }

  /**
   * Get the current active/paused session (if any).
   * Useful for UI display and status checks.
   */
  getCurrentSession(): FocusSession | null {
    return this.currentSession;
  }

  /**
   * Hydrate in-memory state from the database.
   * Should be called on app startup to restore any active session.
   */
  async hydrate(): Promise<void> {
    const activeSessions = await focusSessionRepository.findActive();
    if (activeSessions.length > 0) {
      this.currentSession = this.mapDbSession(activeSessions[0]);
    } else {
      this.currentSession = null;
    }
  }

  // --- Private helpers ---

  /**
   * Retrieve and validate a session exists and matches the in-memory state.
   */
  private async getAndValidateSession(sessionId: string): Promise<FocusSession> {
    // First check in-memory
    if (this.currentSession && this.currentSession.id === sessionId) {
      return this.currentSession;
    }

    // Fall back to database lookup
    const dbRecord = await focusSessionRepository.findById(sessionId);
    if (!dbRecord) {
      throw new Error(`Focus session not found: ${sessionId}`);
    }

    return this.mapDbSession(dbRecord);
  }

  /**
   * Validate that a state transition is allowed.
   */
  private validateTransition(
    currentStatus: FocusSessionStatus,
    targetStatus: FocusSessionStatus
  ): void {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed.includes(targetStatus)) {
      throw new Error(
        `Invalid state transition: cannot move from '${currentStatus}' to '${targetStatus}'`
      );
    }
  }

  /**
   * Map a database record to a FocusSession domain entity.
   */
  private mapDbSession(record: Record<string, unknown>): FocusSession {
    let blockedApps: string[] = [];
    let allowedApps: string[] = [];

    try {
      blockedApps = record.blockedApps ? JSON.parse(record.blockedApps as string) : [];
    } catch {
      blockedApps = [];
    }

    try {
      allowedApps = record.allowedApps ? JSON.parse(record.allowedApps as string) : [];
    } catch {
      allowedApps = [];
    }

    return {
      id: record.id as string,
      preset: record.preset as FocusSession['preset'],
      status: record.status as FocusSession['status'],
      startedAt: record.startedAt instanceof Date ? record.startedAt : new Date(record.startedAt as number),
      endedAt: record.endedAt
        ? record.endedAt instanceof Date
          ? record.endedAt
          : new Date(record.endedAt as number)
        : null,
      plannedDurationMin: record.plannedDurationMin as number,
      actualDurationMin: (record.actualDurationMin as number) ?? null,
      blockedCount: (record.blockedCount as number) ?? 0,
      interruptionCount: (record.interruptionCount as number) ?? 0,
      blockedApps,
      allowedApps,
    };
  }
}

/** Singleton focus engine instance */
export const focusEngine = new FocusEngine();
