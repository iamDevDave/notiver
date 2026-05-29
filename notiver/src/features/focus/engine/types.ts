/**
 * Focus Engine type definitions and interfaces.
 */

import type { FocusPreset, FocusSessionStatus } from '../../../database/schema/focus-sessions';

export type { FocusPreset, FocusSessionStatus };

/**
 * Configuration for starting a focus session.
 */
export interface FocusConfig {
  /** Planned duration in minutes */
  durationMin: number;
  /** Package names of apps to block during the session */
  blockedApps: string[];
  /** Package names of apps to always allow (whitelist overrides blocklist) */
  allowedApps: string[];
}

/**
 * Represents a focus session entity (mirrors DB schema).
 */
export interface FocusSession {
  id: string;
  preset: FocusPreset;
  status: FocusSessionStatus;
  startedAt: Date;
  endedAt: Date | null;
  plannedDurationMin: number;
  actualDurationMin: number | null;
  blockedCount: number;
  interruptionCount: number;
  blockedApps: string[];
  allowedApps: string[];
}

/**
 * Result returned when a focus session ends.
 */
export interface FocusSessionResult {
  sessionId: string;
  preset: FocusPreset;
  status: 'completed' | 'cancelled';
  durationMin: number;
  blockedCount: number;
  interruptionCount: number;
}

/**
 * IFocusEngine interface as defined in the design document.
 */
export interface IFocusEngine {
  startSession(preset: FocusPreset, config: FocusConfig): Promise<FocusSession>;
  pauseSession(sessionId: string): Promise<void>;
  resumeSession(sessionId: string): Promise<void>;
  endSession(sessionId: string): Promise<FocusSessionResult>;
  isBlocked(packageName: string): boolean;
}

/**
 * Valid state transitions for focus sessions.
 *
 * State machine:
 *   active → paused
 *   active → completed
 *   active → cancelled
 *   paused → active (resume)
 *   paused → completed
 *   paused → cancelled
 */
export const VALID_TRANSITIONS: Record<FocusSessionStatus, FocusSessionStatus[]> = {
  active: ['paused', 'completed', 'cancelled'],
  paused: ['active', 'completed', 'cancelled'],
  completed: [],
  cancelled: [],
};
