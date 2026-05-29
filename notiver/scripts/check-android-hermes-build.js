#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Bug condition exploration check — Property 1: Android Hermes Build Succeeds.
 *
 * Spec: .kiro/specs/android-build-failure-fix
 *   Requirements: 1.1, 1.2, 1.3  (Expected behavior: 2.1, 2.2, 2.3)
 *
 * This is a deterministic build-toolchain check (not a pure unit test). It
 * reproduces the primary branch of isBugCondition(input) for an `androidExport`
 * input:
 *
 *   1. Runs `npx expo export --platform android` and asserts:
 *        - the output contains ZERO `private properties are not supported`
 *          errors emitted by the SDK 54 Hermes compiler (hermesc.exe), and
 *        - the command exits with code 0.
 *
 *   2. Runs `npx expo install --check` and asserts no SDK version mismatches
 *      are reported (notably `babel-preset-expo`).
 *
 * EXPECTED OUTCOME on UNFIXED code: this check FAILS (exit code 1). That failure
 * is the SUCCESS condition for the exploration task — it confirms the bug.
 *
 * After the fix lands (babel-preset-expo aligned to ~54.0.x), this same check
 * is expected to PASS, validating the fix.
 *
 * Usage:  node scripts/check-android-hermes-build.js
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PRIVATE_PROP_ERROR = 'private properties are not supported';
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, '.hermes-build-check-out');

/** Run a command, capturing combined stdout/stderr. Non-interactive. */
function run(command) {
  const res = spawnSync(command, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    shell: true, // required for `npx` resolution on Windows
    input: '', // never block on an interactive prompt
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' },
  });
  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  return {
    status: res.status,
    error: res.error,
    stdout,
    stderr,
    combined: `${stdout}\n${stderr}`,
  };
}

function cleanup() {
  try {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}

function countOccurrences(haystack, needle) {
  if (!haystack) return 0;
  return haystack.split(needle).length - 1;
}

/** Extract the dependency-mismatch lines reported by `expo install --check`. */
function extractMismatchLines(output) {
  return output
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /expected version|should be updated|→|->/i.test(l));
}

function main() {
  cleanup();

  console.log('=== Property 1 exploration check: Android Hermes Build Succeeds ===\n');

  // ---------------------------------------------------------------------------
  // Step 1 — SDK dependency compatibility (Requirement 1.3 / 2.3)
  // ---------------------------------------------------------------------------
  console.log('> npx expo install --check');
  const check = run('npx expo install --check');
  const mismatchLines = extractMismatchLines(check.combined);
  const babelMismatch = /babel-preset-expo/i.test(check.combined);
  const depsCompatible = check.status === 0 && mismatchLines.length === 0;

  console.log(`  exit code: ${check.status}`);
  if (mismatchLines.length > 0) {
    console.log('  reported mismatches:');
    for (const line of mismatchLines) console.log(`    ${line}`);
  }
  console.log('');

  // ---------------------------------------------------------------------------
  // Step 2 — Android export + Hermes compile (Requirements 1.1, 1.2 / 2.1, 2.2)
  // ---------------------------------------------------------------------------
  console.log(`> npx expo export --platform android --output-dir ${path.basename(OUTPUT_DIR)}`);
  const exportRes = run(
    `npx expo export --platform android --output-dir "${OUTPUT_DIR}"`
  );
  const privatePropErrorCount = countOccurrences(exportRes.combined, PRIVATE_PROP_ERROR);
  const exportSucceeded = exportRes.status === 0 && privatePropErrorCount === 0;

  console.log(`  exit code: ${exportRes.status}`);
  console.log(`  "${PRIVATE_PROP_ERROR}" occurrences: ${privatePropErrorCount}`);
  if (privatePropErrorCount > 0) {
    const sample = exportRes.combined
      .split(/\r?\n/)
      .filter((l) => l.includes(PRIVATE_PROP_ERROR))
      .slice(0, 5);
    console.log('  sample counterexample lines:');
    for (const line of sample) console.log(`    ${line.trim()}`);
  }
  console.log('');

  cleanup();

  // ---------------------------------------------------------------------------
  // Verdict
  // ---------------------------------------------------------------------------
  const passed = depsCompatible && exportSucceeded;

  console.log('=== Result ===');
  console.log(`  Dependencies compatible (expo install --check): ${depsCompatible}`);
  console.log(`  Android Hermes build clean (export):            ${exportSucceeded}`);
  console.log('');

  if (passed) {
    console.log('PASS: Android Hermes build succeeded and dependencies are compatible.');
    process.exit(0);
  }

  console.log('FAIL: bug condition reproduced. Counterexamples:');
  if (!depsCompatible) {
    console.log(
      `  - expo install --check reported version mismatch(es)` +
        `${babelMismatch ? ' (including babel-preset-expo)' : ''}.`
    );
  }
  if (!exportSucceeded) {
    console.log(
      `  - expo export emitted ${privatePropErrorCount} "${PRIVATE_PROP_ERROR}" ` +
        `error(s) and exited with code ${exportRes.status}.`
    );
  }
  process.exit(1);
}

main();
