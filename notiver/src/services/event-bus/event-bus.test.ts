import { eventBus } from './index';
import type { EventHandler } from './types';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it('should emit events to registered handlers', () => {
    const handler = jest.fn();
    eventBus.on('test:event', handler);

    eventBus.emit('test:event', { data: 'hello' });

    expect(handler).toHaveBeenCalledWith({ data: 'hello' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support multiple handlers for the same event', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    eventBus.on('test:event', handler1);
    eventBus.on('test:event', handler2);

    eventBus.emit('test:event', 'payload');

    expect(handler1).toHaveBeenCalledWith('payload');
    expect(handler2).toHaveBeenCalledWith('payload');
  });

  it('should not call handlers for different events', () => {
    const handler = jest.fn();
    eventBus.on('event:a', handler);

    eventBus.emit('event:b', 'payload');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should unsubscribe via returned function', () => {
    const handler = jest.fn();
    const unsubscribe = eventBus.on('test:event', handler);

    eventBus.emit('test:event', 'first');
    unsubscribe();
    eventBus.emit('test:event', 'second');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('first');
  });

  it('should unsubscribe via off()', () => {
    const handler: EventHandler<string> = jest.fn();
    eventBus.on('test:event', handler);

    eventBus.emit('test:event', 'first');
    eventBus.off('test:event', handler);
    eventBus.emit('test:event', 'second');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not throw when emitting with no listeners', () => {
    expect(() => eventBus.emit('no:listeners', 'data')).not.toThrow();
  });

  it('should not throw when calling off for non-existent event', () => {
    const handler = jest.fn();
    expect(() => eventBus.off('no:event', handler)).not.toThrow();
  });

  it('should handle errors in handlers without affecting other handlers', () => {
    const errorHandler = jest.fn(() => {
      throw new Error('handler error');
    });
    const goodHandler = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    eventBus.on('test:event', errorHandler);
    eventBus.on('test:event', goodHandler);

    eventBus.emit('test:event', 'payload');

    expect(errorHandler).toHaveBeenCalled();
    expect(goodHandler).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should report correct listener count', () => {
    expect(eventBus.listenerCount('test:event')).toBe(0);

    const unsub1 = eventBus.on('test:event', jest.fn());
    eventBus.on('test:event', jest.fn());

    expect(eventBus.listenerCount('test:event')).toBe(2);

    unsub1();
    expect(eventBus.listenerCount('test:event')).toBe(1);
  });

  it('should clear all listeners', () => {
    eventBus.on('event:a', jest.fn());
    eventBus.on('event:b', jest.fn());

    eventBus.clear();

    expect(eventBus.listenerCount('event:a')).toBe(0);
    expect(eventBus.listenerCount('event:b')).toBe(0);
  });
});
