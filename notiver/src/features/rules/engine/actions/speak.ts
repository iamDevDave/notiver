import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ActionExecutor, ActionResult } from './types';

/**
 * Speak action executor.
 * Reads notification content aloud using text-to-speech.
 *
 * In production, this will use a TTS native module or expo-speech.
 * For MVP, logs the intent and returns success.
 *
 * Config:
 * - field: 'title' | 'content' | 'all' — which field to speak (default: 'all')
 * - language: string — TTS language code (default: 'en-US')
 * - rate: number — speech rate 0.1-2.0 (default: 1.0)
 */
export const speakExecutor: ActionExecutor = {
  async execute(notification: ParsedNotification, config: Record<string, unknown>): Promise<ActionResult> {
    const field = typeof config.field === 'string' ? config.field : 'all';
    const language = typeof config.language === 'string' ? config.language : 'en-US';
    const rate = typeof config.rate === 'number' ? config.rate : 1.0;

    let textToSpeak: string;

    switch (field) {
      case 'title':
        textToSpeak = notification.title ?? '';
        break;
      case 'content':
        textToSpeak = notification.content ?? '';
        break;
      case 'all':
      default:
        textToSpeak = [notification.title, notification.content].filter(Boolean).join('. ');
        break;
    }

    if (!textToSpeak) {
      return { success: false, error: 'Nothing to speak — field is empty' };
    }

    console.log(`[Action:Speak] Speaking (${language}, rate=${rate}): "${textToSpeak.slice(0, 50)}..."`);
    // TODO: Implement TTS via expo-speech or native module
    return { success: true };
  },
};
