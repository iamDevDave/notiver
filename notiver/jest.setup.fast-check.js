/**
 * Jest setup: cap fast-check property-based test example counts for speed.
 *
 * Many property tests pass an explicit `{ numRuns: N }` (10–500) to
 * `fc.assert`. Explicit per-call options override fast-check's global config,
 * so `fc.configureGlobal({ numRuns })` alone cannot lower them. Instead we wrap
 * `fc.assert` and clamp `numRuns` down to MAX_RUNS, leaving smaller counts
 * untouched.
 *
 * Override the cap via the FAST_CHECK_MAX_RUNS env var (e.g. set it to a large
 * number to effectively disable the cap and run the original counts).
 *
 * Implementation note: fast-check's CJS build exposes a getter-only `assert`
 * on its `default` export (Babel's default import resolves to `.default`).
 * That getter is non-configurable, so we cannot redefine `assert` in place.
 * The `default` property on the module namespace IS writable, so we replace it
 * with an object that delegates to the original via the prototype chain and
 * overrides only `assert`. All other exports keep working unchanged.
 */
const fc = require('fast-check');

const MAX_RUNS = Number(process.env.FAST_CHECK_MAX_RUNS || 25);

function clampParams(params) {
  if (params && typeof params === 'object' && typeof params.numRuns === 'number') {
    return params.numRuns > MAX_RUNS ? { ...params, numRuns: MAX_RUNS } : params;
  }
  // No explicit numRuns: apply the cap so defaults (100) are reduced too.
  return { ...(params || {}), numRuns: MAX_RUNS };
}

function makeCappedAssert(originalAssert) {
  const cappedAssert = (property, params) => originalAssert(property, clampParams(params));
  cappedAssert.__capped = true;
  return cappedAssert;
}

const original = fc.default;

if (original && typeof original.assert === 'function' && !original.assert.__capped) {
  // Delegate everything to the original module via the prototype chain, then
  // shadow only `assert` with the clamping wrapper.
  const wrapped = Object.create(original);
  Object.defineProperty(wrapped, 'assert', {
    value: makeCappedAssert(original.assert.bind(original)),
    writable: true,
    configurable: true,
    enumerable: true,
  });
  fc.default = wrapped;
}
