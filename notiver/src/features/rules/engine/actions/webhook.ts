import type { ParsedNotification } from '../../../../services/notification/parser';
import type { ActionExecutor, ActionResult } from './types';

/**
 * Webhook action executor.
 * Sends notification data to an external URL via HTTP POST.
 *
 * Config:
 * - url: string — the webhook endpoint URL (required)
 * - headers: Record<string, string> — optional custom headers
 * - includeContent: boolean — whether to include full notification content (default: true)
 */
export const webhookExecutor: ActionExecutor = {
  async execute(notification: ParsedNotification, config: Record<string, unknown>): Promise<ActionResult> {
    const url = typeof config.url === 'string' ? config.url : '';

    if (!url) {
      return { success: false, error: 'Webhook URL is required' };
    }

    const includeContent = config.includeContent !== false;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(typeof config.headers === 'object' && config.headers !== null
        ? (config.headers as Record<string, string>)
        : {}),
    };

    const payload = {
      notificationId: notification.id,
      appName: notification.appName,
      packageName: notification.packageName,
      title: notification.title,
      ...(includeContent ? { content: notification.content } : {}),
      sender: notification.sender,
      priority: notification.priority,
      receivedAt: notification.receivedAt.toISOString(),
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return { success: false, error: `Webhook returned ${response.status}: ${response.statusText}` };
      }

      console.log(`[Action:Webhook] Sent notification data to ${url} (status: ${response.status})`);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown fetch error';
      console.warn(`[Action:Webhook] Failed to send to ${url}: ${message}`);
      return { success: false, error: message };
    }
  },
};
