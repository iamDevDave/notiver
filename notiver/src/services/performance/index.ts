/**
 * Performance monitoring utility for the notification pipeline.
 *
 * Provides timing instrumentation to ensure:
 * - Parse + store + emit completes within 100ms (Requirement 15.5)
 * - Rule evaluation completes within 50ms (Requirement 15.6)
 * - Memory usage stays below 200MB (Requirement 15.7)
 */

export interface PerfMeasurement {
  name: string;
  durationMs: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PipelineMetrics {
  parseMs: number;
  storeMs: number;
  emitMs: number;
  totalMs: number;
}

export interface RuleEvalMetrics {
  ruleCount: number;
  matchedCount: number;
  totalMs: number;
  perRuleAvgMs: number;
}

const PIPELINE_THRESHOLD_MS = 100;
const RULE_EVAL_THRESHOLD_MS = 50;

/** Circular buffer for recent measurements (avoids unbounded memory growth) */
const MAX_HISTORY = 100;
let measurementHistory: PerfMeasurement[] = [];
let historyIndex = 0;

/**
 * Records a performance measurement into the circular buffer.
 */
function recordMeasurement(measurement: PerfMeasurement): void {
  if (measurementHistory.length < MAX_HISTORY) {
    measurementHistory.push(measurement);
  } else {
    measurementHistory[historyIndex % MAX_HISTORY] = measurement;
  }
  historyIndex++;
}

/**
 * Measures the execution time of an async function.
 * Logs a warning if the duration exceeds the threshold.
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  thresholdMs?: number
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;

  const measurement: PerfMeasurement = {
    name,
    durationMs: Math.round(durationMs * 100) / 100,
    timestamp: Date.now(),
  };
  recordMeasurement(measurement);

  if (thresholdMs && durationMs > thresholdMs) {
    console.warn(
      `[Perf] ${name} exceeded ${thresholdMs}ms threshold: ${durationMs.toFixed(1)}ms`
    );
  }

  return { result, durationMs };
}

/**
 * Measures the execution time of a synchronous function.
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  thresholdMs?: number
): { result: T; durationMs: number } {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;

  const measurement: PerfMeasurement = {
    name,
    durationMs: Math.round(durationMs * 100) / 100,
    timestamp: Date.now(),
  };
  recordMeasurement(measurement);

  if (thresholdMs && durationMs > thresholdMs) {
    console.warn(
      `[Perf] ${name} exceeded ${thresholdMs}ms threshold: ${durationMs.toFixed(1)}ms`
    );
  }

  return { result, durationMs };
}

/**
 * Measures the full notification pipeline (parse + store + emit).
 * Logs a warning if total exceeds 100ms.
 */
export function createPipelineTimer(): {
  markParse: () => void;
  markStore: () => void;
  markEmit: () => void;
  finish: () => PipelineMetrics;
} {
  const start = performance.now();
  let parseEnd = 0;
  let storeEnd = 0;
  let emitEnd = 0;

  return {
    markParse: () => { parseEnd = performance.now(); },
    markStore: () => { storeEnd = performance.now(); },
    markEmit: () => { emitEnd = performance.now(); },
    finish: () => {
      const totalMs = performance.now() - start;
      const metrics: PipelineMetrics = {
        parseMs: Math.round((parseEnd - start) * 100) / 100,
        storeMs: Math.round((storeEnd - parseEnd) * 100) / 100,
        emitMs: Math.round((emitEnd - storeEnd) * 100) / 100,
        totalMs: Math.round(totalMs * 100) / 100,
      };

      recordMeasurement({
        name: 'notification:pipeline',
        durationMs: metrics.totalMs,
        timestamp: Date.now(),
        metadata: metrics,
      });

      if (totalMs > PIPELINE_THRESHOLD_MS) {
        console.warn(
          `[Perf] Notification pipeline exceeded ${PIPELINE_THRESHOLD_MS}ms: ` +
          `total=${metrics.totalMs}ms (parse=${metrics.parseMs}ms, store=${metrics.storeMs}ms, emit=${metrics.emitMs}ms)`
        );
      }

      return metrics;
    },
  };
}

/**
 * Logs rule evaluation metrics.
 */
export function logRuleEvalMetrics(metrics: RuleEvalMetrics): void {
  recordMeasurement({
    name: 'rule:evaluation',
    durationMs: metrics.totalMs,
    timestamp: Date.now(),
    metadata: metrics,
  });

  if (metrics.totalMs > RULE_EVAL_THRESHOLD_MS) {
    console.warn(
      `[Perf] Rule evaluation exceeded ${RULE_EVAL_THRESHOLD_MS}ms: ` +
      `total=${metrics.totalMs}ms, rules=${metrics.ruleCount}, matched=${metrics.matchedCount}, avg=${metrics.perRuleAvgMs}ms/rule`
    );
  }
}

/**
 * Returns recent performance measurements for debugging.
 */
export function getRecentMeasurements(): PerfMeasurement[] {
  return [...measurementHistory].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Clears measurement history. Useful for testing.
 */
export function clearMeasurements(): void {
  measurementHistory = [];
  historyIndex = 0;
}

export const THRESHOLDS = {
  PIPELINE_MS: PIPELINE_THRESHOLD_MS,
  RULE_EVAL_MS: RULE_EVAL_THRESHOLD_MS,
} as const;
