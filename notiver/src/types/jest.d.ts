/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Global type declarations for Jest 30.
 * Jest 30 no longer ships @types/jest; this file provides global types
 * so test files don't need explicit imports from '@jest/globals'.
 */

import type { Jest } from '@jest/environment';
import type { JestExpect } from '@jest/expect';
import type { Global } from '@jest/types';

declare global {
  const jest: Jest;
  const expect: JestExpect;
  const describe: Global.GlobalAdditions['describe'];
  const fdescribe: Global.GlobalAdditions['fdescribe'];
  const xdescribe: Global.GlobalAdditions['xdescribe'];
  const it: Global.GlobalAdditions['it'];
  const fit: Global.GlobalAdditions['fit'];
  const xit: Global.GlobalAdditions['xit'];
  const test: Global.GlobalAdditions['test'];
  const xtest: Global.GlobalAdditions['xtest'];
  const beforeAll: Global.GlobalAdditions['beforeAll'];
  const beforeEach: Global.GlobalAdditions['beforeEach'];
  const afterEach: Global.GlobalAdditions['afterEach'];
  const afterAll: Global.GlobalAdditions['afterAll'];
}

export {};
