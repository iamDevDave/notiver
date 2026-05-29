/**
 * Bug Condition Exploration Test: Repository Singleton Initialization
 *
 * Property 3: Bug Condition - Repository Singletons Initialize Without ReferenceError
 *
 * **Validates: Requirements 1.4**
 *
 * This test surfaces the runtime `ReferenceError` thrown while evaluating
 * `src/database/repositories/index.ts`. The index module re-exports its
 * repository classes with re-export specifiers:
 *
 *   export { NotificationRepository } from './notification.repository';
 *
 * A re-export specifier does NOT create a local binding usable in the same
 * module. The file then constructs singletons in the same module scope:
 *
 *   export const notificationRepository = new NotificationRepository();
 *
 * Because `NotificationRepository` (and the other repository names) were only
 * re-exported and never imported as local bindings, the `new X()` expressions
 * reference undefined names and throw `ReferenceError: X is not defined` at
 * module-evaluation time. `notificationRepository` is the first singleton
 * declared, so the first error surfaced is
 * `ReferenceError: NotificationRepository is not defined`.
 *
 * EXPECTED OUTCOME ON UNFIXED CODE: this test FAILS — `require('./index')`
 * throws a `ReferenceError`. That failure is the SUCCESS condition for this
 * exploration task: it confirms the re-export-binding root cause described in
 * the design. DO NOT fix the test or the source while this task is active.
 *
 * After the fix (task 4.2), the index module will import the classes as local
 * bindings, the singletons will construct cleanly, and this test will PASS.
 */

// The repository classes import `db` from '../index' (the database module),
// which eagerly opens a native expo-sqlite database at module load. Mock that
// module so the only failure surfaced is the re-export-binding defect, not a
// native-module load error. This mirrors the existing repository property test.
jest.mock('../index', () => {
  const createMockDb = () => ({
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    $dynamic: jest.fn().mockReturnThis(),
  });

  return {
    db: createMockDb(),
    expoDb: {},
    initializeDatabase: jest.fn(),
  };
});

const REPOSITORY_SINGLETONS = [
  'notificationRepository',
  'ruleRepository',
  'ruleExecutionRepository',
  'analyticsRepository',
  'focusSessionRepository',
  'settingsRepository',
  'aiPredictionRepository',
] as const;

describe('Property 3: Bug Condition - Repository Singletons Initialize Without ReferenceError', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('loads src/database/repositories/index.ts without throwing a ReferenceError', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./index');
    }).not.toThrow();
  });

  it('exposes defined repository singleton instances after the module loads', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const repositories = require('./index');

    for (const name of REPOSITORY_SINGLETONS) {
      expect(repositories[name]).toBeDefined();
    }
  });
});
