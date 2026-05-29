/**
 * Options for querying collections of entities.
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Options for filtering entities.
 */
export interface FilterOptions {
  [key: string]: unknown;
}

/**
 * Base repository interface for all entity repositories.
 * Provides standard CRUD operations with type safety.
 *
 * @template T - The entity type
 * @template ID - The identifier type (defaults to string)
 */
export interface IRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  create(entity: Omit<T, 'id' | 'createdAt'>): Promise<T>;
  update(id: ID, partial: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
  count(filter?: FilterOptions): Promise<number>;
}
