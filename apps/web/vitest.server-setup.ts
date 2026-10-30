// Runs before every server test file (vitest.server.config.mts). It refuses
// to run any test unless the run's local test database, mock buddy and email
// outbox are loaded; serves the test's session cookies as next/headers'
// `cookies()`; runs next/server's `after()` tasks at once; and after each
// test waits for those tasks, signs out and deletes the test's users and
// data (the kits in test/component-integration/test-database/ and
// test/support/test-database/).
import { afterEach, vi } from "vitest";
import { checkTestEnvironment } from "./scripts/test-db/test-database.ts";
import { afterTasksDone } from "./test/component-integration/test-database/after-test-kit.ts";
import { clearCookies } from "./test/component-integration/test-database/session-test-kit.ts";
import { removeTestData } from "./test/support/test-database/data-test-kit.ts";
import { deleteTestUsers } from "./test/support/test-database/user-test-kit.ts";

checkTestEnvironment();

// The factories are hoisted above the imports, so they import the kit
// themselves.
vi.mock("next/headers", async (importOriginal) => {
  const { sessionCookies } = await import(
    "./test/component-integration/test-database/session-test-kit.ts"
  );
  return {
    ...(await importOriginal<typeof import("next/headers")>()),
    cookies: sessionCookies,
  };
});

// `connection()` waits for a request, and Next's `after()` needs one, which
// a server test has none of.
vi.mock("next/server", async (importOriginal) => {
  const { after } = await import(
    "./test/component-integration/test-database/after-test-kit.ts"
  );
  return {
    ...(await importOriginal<typeof import("next/server")>()),
    connection: (): Promise<void> => Promise.resolve(),
    after,
  };
});

afterEach(async () => {
  await afterTasksDone();
  clearCookies();
  await removeTestData();
  await deleteTestUsers();
});
