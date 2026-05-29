/**
 * Shared type exports for the Notification Intelligence Platform.
 */

// Re-export core types
export type { IRepository, QueryOptions, FilterOptions } from '../core/base';

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<T>;

/**
 * Base entity interface that all domain entities extend.
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Timestamp fields added to entities automatically.
 */
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}
