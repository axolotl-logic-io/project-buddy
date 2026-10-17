import { defineConfig } from "vitest/config";

// The server tests (src/**/*.server.test.ts): Vitest in Node against the test
// database that .env.test names, with real users and sessions from the kit
// in src/test-database/. `npm run test:server` resets that database, loads
// .env.test and runs them; `npm test` never does, so it needs no database.

// The longest a server test, or a hook such as the setup file's afterEach
// cleanup, may take: their database round trips and POST /api/chat calls,
// which have no event to wait for in place of this clock. The worst test
// measured took 12 742 ms, its afterEach cleanup included, at 1-minute load
// averages of 38-50 on 10 cores (other suites running beside it, plus one
// busy loop per core); this is about 3 times that (web-tests-under-load). It
// is here so a busy machine fails no test on timing (flakes-are-failures),
// not as a budget for slow tests.
const SERVER_TEST_TIMEOUT_MS = 40_000;

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: "server",
    environment: "node",
    include: ["src/**/*.server.test.ts"],
    setupFiles: ["./vitest.server-setup.ts"],
    testTimeout: SERVER_TEST_TIMEOUT_MS,
    hookTimeout: SERVER_TEST_TIMEOUT_MS,
  },
});
