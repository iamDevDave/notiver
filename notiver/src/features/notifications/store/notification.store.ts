import { create } from 'zustand';
import type { NotificationCategory } from '@/src/database/schema/notifications';

export type SortField = 'date' | 'priority' | 'app';
export type SortDirection = 'asc' | 'desc';

export interface NotificationFilters {
  searchQuery: string;
  category: NotificationCategory | null;
  appName: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  priority: number | null;
  isRead: boolean | null;
}

export interface NotificationSortOptions {
  field: SortField;
  direction: SortDirection;
}

export interface NotificationStore {
  filters: NotificationFilters;
  sort: NotificationSortOptions;
  selectedId: string | null;

  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<NotificationFilters>) => void;
  setSort: (sort: NotificationSortOptions) => void;
  setSelected: (id: string | null) => void;
  clearFilters: () => void;
}

const defaultFilters: NotificationFilters = {
  searchQuery: '',
  category: null,
  appName: null,
  dateFrom: null,
  dateTo: null,
  priority: null,
  isRead: null,
};

const defaultSort: NotificationSortOptions = {
  field: 'date',
  direction: 'desc',
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  filters: defaultFilters,
  sort: defaultSort,
  selectedId: null,

  setSearchQuery: (query) =>
    set((state) => ({
      filters: { ...state.filters, searchQuery: query },
    })),

  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),

  setSort: (sort) => set({ sort }),

  setSelected: (id) => set({ selectedId: id }),

  clearFilters: () => set({ filters: defaultFilters }),
}));
