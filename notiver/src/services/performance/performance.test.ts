import {
  measureAsync,
  measureSync,
  createPipelineTimer,
  logRuleEvalMetrics,
  getRecentMeasurements,
  clearMeasurements,
  THRESHOLDS,
} from './index';

describe('Performance Monitoring', () => {
  beforeEach(() => {
    clearMeasurements();
  });

  describe('measureAsync', () => {
    it('measures async function execution time', async () => {
      const { result, durationMs } = await measureAsync(
        'test-async',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 42;
        }
      );

      expect(result).toBe(42);
      expect(durationMs).toBeGreaterThanOrEqual(9);
    });

    it('records measurement in history', async () => {
      await measureAsync('test-record', async () => 'done');

      const measurements = getRecentMeasurements();
      expect(measurements).toHaveLength(1);
      expect(measurements[0].name).toBe('test-record');
      expect(measurements[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    it('logs warning when threshold is exceeded', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await measureAsync(
        'slow-op',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          return 'done';
        },
        5 // 5ms threshold
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Perf] slow-op exceeded 5ms')
      );
      warnSpy.mockRestore();
    });

    it('does not warn when within threshold', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await measureAsync(
        'fast-op',
        async () => 'done',
        1000 // 1000ms threshold — should not trigger
      );

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('measureSync', () => {
    it('measures synchronous function execution time', () => {
      const { result, durationMs } = measureSync('test-sync', () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) sum += i;
        return sum;
      });

      expect(result).toBe(499500);
      expect(durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createPipelineTimer', () => {
    it('tracks parse, store, and emit phases', () => {
      const timer = createPipelineTimer();

      // Simulate pipeline phases
      timer.markParse();
      timer.markStore();
      timer.markEmit();

      const metrics = timer.finish();

      expect(metrics.parseMs).toBeGreaterThanOrEqual(0);
      expect(metrics.storeMs).toBeGreaterThanOrEqual(0);
      expect(metrics.emitMs).toBeGreaterThanOrEqual(0);
      expect(metrics.totalMs).toBeGreaterThanOrEqual(0);
    });

    it('records pipeline measurement in history', () => {
      const timer = createPipelineTimer();
      timer.markParse();
      timer.markStore();
      timer.markEmit();
      timer.finish();

      const measurements = getRecentMeasurements();
      expect(measurements.some((m) => m.name === 'notification:pipeline')).toBe(true);
    });
  });

  describe('logRuleEvalMetrics', () => {
    it('records rule evaluation metrics', () => {
      logRuleEvalMetrics({
        ruleCount: 50,
        matchedCount: 3,
        totalMs: 25,
        perRuleAvgMs: 0.5,
      });

      const measurements = getRecentMeasurements();
      expect(measurements.some((m) => m.name === 'rule:evaluation')).toBe(true);
    });

    it('warns when exceeding threshold', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      logRuleEvalMetrics({
        ruleCount: 100,
        matchedCount: 5,
        totalMs: 75, // Exceeds 50ms threshold
        perRuleAvgMs: 0.75,
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rule evaluation exceeded 50ms')
      );
      warnSpy.mockRestore();
    });
  });

  describe('THRESHOLDS', () => {
    it('defines correct pipeline threshold', () => {
      expect(THRESHOLDS.PIPELINE_MS).toBe(100);
    });

    it('defines correct rule evaluation threshold', () => {
      expect(THRESHOLDS.RULE_EVAL_MS).toBe(50);
    });
  });

  describe('clearMeasurements', () => {
    it('clears all recorded measurements', async () => {
      await measureAsync('test-1', async () => 'a');
      await measureAsync('test-2', async () => 'b');

      expect(getRecentMeasurements()).toHaveLength(2);

      clearMeasurements();

      expect(getRecentMeasurements()).toHaveLength(0);
    });
  });
});
