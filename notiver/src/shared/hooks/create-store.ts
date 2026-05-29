/**
 * Zustand store factory pattern.
 * Provides a typed helper for creating per-feature Zustand stores
 * with consistent patterns (reset, selectors).
 */

import { create, type StateCreator } from 'zustand';

/**
 * Base state shape that all feature stores should extend.
 * Provides a reset action to return to initial state.
 */
export interface BaseStoreState {
  reset: () => void;
}

/**
 * Creates a typed Zustand store with a built-in reset action.
 *
 * Usage:
 * ```ts
 * interface DashboardState extends BaseStoreState {
 *   selectedPeriod: 'daily' | 'weekly' | 'monthly';
 *   setSelectedPeriod: (period: DashboardState['selectedPeriod']) => void;
 * }
 *
 * const useDashboardStore = createStore<DashboardState>((set) => ({
 *   selectedPeriod: 'daily',
 *   setSelectedPeriod: (period) => set({ selectedPeriod: period }),
 *   reset: () => set({ selectedPeriod: 'daily' }),
 * }));
 * ```
 */
export function createStore<T extends BaseStoreState>(
  stateCreator: StateCreator<T>,
) {
  return create<T>(stateCreator);
}
