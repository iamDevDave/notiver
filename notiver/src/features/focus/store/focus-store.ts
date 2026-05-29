/**
 * Focus Mode UI Zustand store.
 *
 * Manages the UI state for focus mode: preset selection, app management,
 * schedule configuration, and active session timer state.
 */

import { create } from 'zustand';
import type { FocusPreset } from '../engine/types';

export interface ScheduleConfig {
  enabled: boolean;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

export type FocusView = 'presets' | 'active-session' | 'app-management' | 'schedule';

export interface FocusStoreState {
  /** Current view in the focus mode modal */
  currentView: FocusView;
  /** Selected preset for starting a session */
  selectedPreset: FocusPreset | null;
  /** Duration in minutes for the session */
  durationMin: number;
  /** Apps to block during focus */
  blockedApps: string[];
  /** Apps to always allow (whitelist) */
  allowedApps: string[];
  /** Schedule configuration */
  schedule: ScheduleConfig;
  /** Whether the timer is running (for UI display) */
  timerRunning: boolean;
}

export interface FocusStoreActions {
  setView: (view: FocusView) => void;
  selectPreset: (preset: FocusPreset) => void;
  setDuration: (minutes: number) => void;
  addBlockedApp: (packageName: string) => void;
  removeBlockedApp: (packageName: string) => void;
  addAllowedApp: (packageName: string) => void;
  removeAllowedApp: (packageName: string) => void;
  setSchedule: (schedule: Partial<ScheduleConfig>) => void;
  setTimerRunning: (running: boolean) => void;
  reset: () => void;
}

export type FocusStore = FocusStoreState & FocusStoreActions;

/** Default preset durations in minutes */
export const PRESET_DURATIONS: Record<FocusPreset, number> = {
  study: 45,
  work: 60,
  sleep: 480,
  meeting: 30,
  custom: 25,
};

/** Preset display metadata */
export const PRESET_META: Record<FocusPreset, { label: string; icon: string; color: string; description: string }> = {
  study: { label: 'Study', icon: 'BookOpen', color: '#3B82F6', description: 'Deep focus for learning' },
  work: { label: 'Work', icon: 'Briefcase', color: '#10B981', description: 'Productive work sessions' },
  sleep: { label: 'Sleep', icon: 'Moon', color: '#8B5CF6', description: 'Block all during rest' },
  meeting: { label: 'Meeting', icon: 'Users', color: '#F59E0B', description: 'Silence during meetings' },
  custom: { label: 'Custom', icon: 'Settings', color: '#A1A1AA', description: 'Configure your own' },
};

const initialState: FocusStoreState = {
  currentView: 'presets',
  selectedPreset: null,
  durationMin: 25,
  blockedApps: [],
  allowedApps: [],
  schedule: {
    enabled: false,
    startHour: 9,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    days: [1, 2, 3, 4, 5], // Mon-Fri
  },
  timerRunning: false,
};

export const useFocusStore = create<FocusStore>((set) => ({
  ...initialState,

  setView: (view) => set({ currentView: view }),

  selectPreset: (preset) =>
    set({
      selectedPreset: preset,
      durationMin: PRESET_DURATIONS[preset],
    }),

  setDuration: (minutes) => set({ durationMin: minutes }),

  addBlockedApp: (packageName) =>
    set((state) => ({
      blockedApps: state.blockedApps.includes(packageName)
        ? state.blockedApps
        : [...state.blockedApps, packageName],
    })),

  removeBlockedApp: (packageName) =>
    set((state) => ({
      blockedApps: state.blockedApps.filter((app) => app !== packageName),
    })),

  addAllowedApp: (packageName) =>
    set((state) => ({
      allowedApps: state.allowedApps.includes(packageName)
        ? state.allowedApps
        : [...state.allowedApps, packageName],
    })),

  removeAllowedApp: (packageName) =>
    set((state) => ({
      allowedApps: state.allowedApps.filter((app) => app !== packageName),
    })),

  setSchedule: (schedule) =>
    set((state) => ({
      schedule: { ...state.schedule, ...schedule },
    })),

  setTimerRunning: (running) => set({ timerRunning: running }),

  reset: () => set(initialState),
}));
