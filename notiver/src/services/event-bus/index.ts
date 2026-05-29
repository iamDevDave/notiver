/**
 * Event Bus singleton implementation.
 * Provides pub/sub communication between features without direct coupling.
 */

import type { EventHandler, IEventBus, Unsubscribe } from './types';

export { AppEvents } from './types';
export type { IEventBus, EventHandler, Unsubscribe, AppEventName } from './types';

class EventBus implements IEventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  emit<T>(event: string, payload: T): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    handlers.forEach((handler) => {
      try {
        (handler as EventHandler<T>)(payload);
      } catch (error) {
        console.error(`[EventBus] Error in handler for "${event}":`, error);
      }
    });
  }

  on<T>(event: string, handler: EventHandler<T>): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const handlers = this.listeners.get(event)!;
    handlers.add(handler as EventHandler);

    return () => {
      this.off(event, handler as EventHandler);
    };
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    handlers.delete(handler);

    // Clean up empty sets
    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
  }

  /** Remove all listeners. Useful for testing or app reset. */
  clear(): void {
    this.listeners.clear();
  }

  /** Get the count of listeners for a specific event. Useful for debugging. */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

/** Singleton event bus instance for the application */
export const eventBus = new EventBus();
