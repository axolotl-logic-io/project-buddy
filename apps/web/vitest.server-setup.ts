// Runs before every server test file (vitest.server.config.mts). It refuses
// to run any test unless .env.test's test database, mock tutor and email
// outbox are loaded; serves the test's session cookies as next/headers'
// `cookies()`; and after each test signs out and deletes the test's users
// and data (src/test-database/).
import { afterEach, vi } from "vitest";
import { checkTestEnvironment } from "./scripts/test-db/test-database.ts";
import { removeTestData } from "./src/test-database/data-test-kit.ts";
import { clearCookies } from "./src/test-database/session-test-kit.ts";
import { deleteTestUsers } from "./src/test-database/user-test-kit.ts";

checkTestEnvironment();

// The factories are hoisted above the imports, so they import the kit
// themselves.
vi.mock("next/headers", async (importOriginal) => {
  const { sessionCookies } = await import(
    "./src/test-database/session-test-kit.ts"
  );
  return {
    ...(await importOriginal<typeof import("next/headers")>()),
    cookies: sessionCookies,
  };
});

// `connection()` waits for a request, which a server test has none of.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: (): Promise<void> => Promise.resolve(),
}));

afterEach(async () => {
  clearCookies();
  await removeTestData();
  await deleteTestUsers();
});
