/**
 * Notification Processing Pipeline Service.
 *
 * Orchestrates the notification lifecycle:
 * 1. Subscribes to the native notification listener bridge
 * 2. Parses raw notifications into typed entities
 * 3. Persists parsed notifications to the database
 * 4. Emits events on the event bus for downstream consumers (Rule_Engine, Analytics_Service, AI_Classifier)
 *
 * Performance target: complete pipeline (parse + store + emit) within 100ms per notification.
 * Instrumented with performance timing to detect threshold violations.
 */

import { notificationRepository } from '../../database/repositories';
import { notificationListenerBridge } from '../../native/notification-listener';
import type { RawNotification } from '../../native/notification-listener/types';
import { eventBus } from '../event-bus';
import { AppEvents } from '../event-bus/types';
import { createPipelineTimer } from '../performance';
import type { ParsedNotification } from './parser';
import { parseNotification } from './parser';

class NotificationService {
  private unsubscribe: (() => void) | null = null;
  private isRunning = false;

  /**
   * Start the notification processing pipeline.
   * Subscribes to the native bridge and begins processing incoming notifications.
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[NotificationService] Pipeline already running');
      return;
    }

    this.unsubscribe = notificationListenerBridge.onNotificationReceived(
      (raw: RawNotification) => {
        this.processNotification(raw).catch((error) => {
          console.error('[NotificationService] Unhandled pipeline error:', error);
        });
      }
    );

    this.isRunning = true;
    console.log('[NotificationService] Pipeline started');
  }

  /**
   * Stop the notification processing pipeline.
   * Unsubscribes from the native bridge and stops processing.
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('[NotificationService] Pipeline not running');
      return;
    }

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.isRunning = false;
    console.log('[NotificationService] Pipeline stopped');
  }

  /**
   * Process a single raw notification through the pipeline.
   * Steps: parse → persist → emit events
   *
   * Performance instrumented: logs warning if total exceeds 100ms.
   * Errors are caught and logged to prevent crashing the pipeline.
   */
  private async processNotification(raw: RawNotification): Promise<void> {
    const timer = createPipelineTimer();

    try {
      // Step 1: Parse the raw notification into a typed entity
      const parsed: ParsedNotification = parseNotification(raw);
      timer.markParse();

      // Step 2: Persist to database
      await notificationRepository.create({
        id: parsed.id,
        packageName: parsed.packageName,
        appName: parsed.appName,
        title: parsed.title,
        content: parsed.content,
        sender: parsed.sender,
        priority: parsed.priority,
        isRead: parsed.isRead,
        isArchived: parsed.isArchived,
        rawData: parsed.rawData,
        receivedAt: parsed.receivedAt,
        category: null,
      } as any);
      timer.markStore();

      // Step 3: Emit events for downstream processing
      // "notification:received" — consumed by Rule_Engine and Analytics_Service
      eventBus.emit(AppEvents.NOTIFICATION_RECEIVED, parsed);

      // "notification:parsed" — consumed by AI_Classifier for categorization
      eventBus.emit(AppEvents.NOTIFICATION_PARSED, parsed);
      timer.markEmit();

      // Record pipeline metrics
      timer.finish();
    } catch (error) {
      // Log and continue — don't crash the pipeline on individual notification failures
      console.error(
        '[NotificationService] Failed to process notification:',
        error instanceof Error ? error.message : error
      );
    }
  }

  /** Check if the pipeline is currently active */
  getIsRunning(): boolean {
    return this.isRunning;
  }
}

/** Singleton notification service instance */
export const notificationService = new NotificationService();
