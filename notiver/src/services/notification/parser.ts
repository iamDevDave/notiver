import type { RawNotification } from '../../native/notification-listener/types';

/**
 * Parsed notification entity matching the database schema.
 * All fields are validated and normalized from the raw notification payload.
 */
export interface ParsedNotification {
  id: string;
  packageName: string;
  appName: string;
  title: string | null;
  content: string | null;
  sender: string | null;
  priority: number;
  isRead: boolean;
  isArchived: boolean;
  rawData: string | null;
  receivedAt: Date;
  createdAt: Date;
}

/** Maximum allowed length for text fields to prevent storage bloat */
const MAX_TITLE_LENGTH = 500;
const MAX_CONTENT_LENGTH = 5000;
const MAX_SENDER_LENGTH = 200;
const MAX_PACKAGE_NAME_LENGTH = 256;
const MAX_APP_NAME_LENGTH = 256;

/**
 * Normalizes a nullable string field:
 * - null/undefined → null
 * - Empty or whitespace-only strings → null
 * - Valid strings → trimmed and truncated to maxLength
 */
function normalizeStringField(
  value: string | null | undefined,
  maxLength: number
): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

/**
 * Normalizes a required string field:
 * - Falls back to defaultValue if null/undefined/empty
 * - Truncates to maxLength
 */
function normalizeRequiredString(
  value: string | null | undefined,
  maxLength: number,
  defaultValue: string
): string {
  if (value == null) return defaultValue;
  if (typeof value !== 'string') return defaultValue;
  const trimmed = value.trim();
  if (trimmed.length === 0) return defaultValue;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

/**
 * Normalizes the priority field:
 * - Must be a finite integer
 * - Invalid values (NaN, Infinity, non-number) → default 0
 */
function normalizePriority(value: unknown): number {
  if (typeof value !== 'number') return 0;
  if (!Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

/**
 * Normalizes the timestamp field:
 * - Must be a positive finite number (Unix ms)
 * - Invalid values → current time
 */
function normalizeTimestamp(value: unknown): Date {
  if (typeof value !== 'number') return new Date();
  if (!Number.isFinite(value) || value <= 0) return new Date();
  return new Date(value);
}

/**
 * Serializes the raw notification extras to a JSON string for storage.
 * Returns null if serialization fails or extras are empty/invalid.
 */
function serializeRawData(raw: RawNotification): string | null {
  try {
    const data = {
      key: raw.key,
      extras: raw.extras,
    };
    return JSON.stringify(data);
  } catch {
    return null;
  }
}

/**
 * Parses a raw notification from the native bridge into a typed ParsedNotification entity.
 *
 * Handles edge cases:
 * - null/undefined title, content, sender → kept as null
 * - Empty or whitespace-only strings → treated as null
 * - Missing or invalid timestamp → uses current time
 * - Invalid priority (NaN, Infinity, non-number) → defaults to 0
 * - Very long strings → truncated to reasonable limits
 * - Missing packageName/appName → uses "unknown" fallback
 */
export function parseNotification(raw: RawNotification): ParsedNotification {
  const now = new Date();

  return {
    id: crypto.randomUUID(),
    packageName: normalizeRequiredString(raw.packageName, MAX_PACKAGE_NAME_LENGTH, 'unknown'),
    appName: normalizeRequiredString(raw.appName, MAX_APP_NAME_LENGTH, 'Unknown App'),
    title: normalizeStringField(raw.title, MAX_TITLE_LENGTH),
    content: normalizeStringField(raw.content, MAX_CONTENT_LENGTH),
    sender: normalizeStringField(raw.sender, MAX_SENDER_LENGTH),
    priority: normalizePriority(raw.priority),
    isRead: false,
    isArchived: false,
    rawData: serializeRawData(raw),
    receivedAt: normalizeTimestamp(raw.timestamp),
    createdAt: now,
  };
}
