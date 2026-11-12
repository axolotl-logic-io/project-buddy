import { defineConfig } from "vitest/config";

// The server tests (test/**/*.server.test.ts): Vitest in Node against the
// test database, with real users and sessions from the kit in
// test/*/test-database/. `npm run test:server` resets and migrates the database
// configured in .env.test before running these tests. `npm test` needs no database.

// The longest a server test, or a hook such as the setup file's afterEach
// cleanup, may take: their database round trips and POST /api/chat calls,
// which have no event to wait for in place of this clock. The worst test
// measured took 12 742 ms, its afterEach cleanup included, at 1-minute load
// averages of 38-50 on 10 cores (other suites running beside it, plus one
// busy loop per core); this is about 3 times that (web-tests-under-load). It
// is here so a busy machine fails no test on timing (flakes-are-failures),
// not as a budget for slow tests.
const SERVER_TEST_TIMEOUT_MS = 40_000;

// Bound concurrent server-test files on the shared local PostgreSQL server.
// Keep the existing concurrency while changing the database transport.
const SERVER_TEST_FILES_AT_ONCE = 3;

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: "server",
    environment: "node",
    include: ["test/**/*.server.test.ts"],
    setupFiles: ["./vitest.server-setup.ts"],
    maxWorkers: SERVER_TEST_FILES_AT_ONCE,
    testTimeout: SERVER_TEST_TIMEOUT_MS,
    hookTimeout: SERVER_TEST_TIMEOUT_MS,
  },
});
