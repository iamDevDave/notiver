import { eventBus, AppEvents } from '../../../services/event-bus';
import type { Unsubscribe } from '../../../services/event-bus';
import { AIClassifier } from './classifier';
import type { ClassificationInput } from './types';
import {
  aiPredictionRepository,
  notificationRepository,
} from '../../../database/repositories';

/**
 * Payload expected from the "notification:parsed" event.
 * Contains the notification record after parsing and storage.
 */
interface ParsedNotificationPayload {
  id: string;
  title: string | null;
  content: string | null;
  sender: string | null;
}

/**
 * Payload emitted on the "notification:classified" event.
 */
interface ClassifiedNotificationPayload {
  notificationId: string;
  category: string;
  confidence: number;
  matchedKeywords: string[];
}

/**
 * ClassificationService subscribes to parsed notification events,
 * classifies them using the AI keyword classifier, stores predictions,
 * updates the notification category, and emits a classified event.
 */
class ClassificationService {
  private unsubscribe: Unsubscribe | null = null;
  private classifier = new AIClassifier();

  /**
   * Start listening for parsed notification events.
   * Subscribes to "notification:parsed" on the event bus.
   */
  start(): void {
    if (this.unsubscribe) {
      // Already started
      return;
    }

    this.unsubscribe = eventBus.on<ParsedNotificationPayload>(
      AppEvents.NOTIFICATION_PARSED,
      (payload) => {
        void this.handleNotificationParsed(payload);
      }
    );
  }

  /**
   * Stop listening for parsed notification events.
   * Unsubscribes from the event bus.
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Handle a parsed notification: classify, store prediction, update notification, emit event.
   */
  private async handleNotificationParsed(
    payload: ParsedNotificationPayload
  ): Promise<void> {
    try {
      const input: ClassificationInput = {
        title: payload.title,
        content: payload.content,
        sender: payload.sender,
      };

      // Classify the notification
      const result = await this.classifier.classify(input);

      // Store prediction in ai_predictions table
      await aiPredictionRepository.create({
        notificationId: payload.id,
        predictedCategory: result.category,
        confidence: result.confidence,
        matchedKeywords: JSON.stringify(result.matchedKeywords),
      });

      // Update notification category field
      await notificationRepository.update(payload.id, {
        category: result.category,
      });

      // Emit classified event for downstream processing
      const classifiedPayload: ClassifiedNotificationPayload = {
        notificationId: payload.id,
        category: result.category,
        confidence: result.confidence,
        matchedKeywords: result.matchedKeywords,
      };

      eventBus.emit(AppEvents.NOTIFICATION_CLASSIFIED, classifiedPayload);
    } catch (error) {
      console.error(
        '[ClassificationService] Failed to classify notification:',
        error
      );
    }
  }
}

export const classificationService = new ClassificationService();
