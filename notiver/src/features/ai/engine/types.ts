import type { NotificationCategory } from '../../../database/schema/notifications';

/**
 * Input for the AI classifier — the relevant text fields from a notification.
 */
export interface ClassificationInput {
  title: string | null;
  content: string | null;
  sender: string | null;
}

/**
 * Result of classifying a notification.
 */
export interface ClassificationResult {
  category: NotificationCategory;
  confidence: number; // 0.0 - 1.0
  matchedKeywords: string[];
}

/**
 * Keyword dictionary mapping each category to its associated keywords.
 */
export type KeywordDictionary = Record<NotificationCategory, string[]>;

/**
 * AI Classifier interface for notification categorization.
 */
export interface IAIClassifier {
  classify(notification: ClassificationInput): Promise<ClassificationResult>;
  updateKeywords(category: NotificationCategory, keywords: string[]): Promise<void>;
  getKeywordDictionary(): Promise<KeywordDictionary>;
}
