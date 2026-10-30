// A scratch database of one server test's own, beside the test database
// that .env.test names, for a test that migrates or rebuilds a whole
// database: the shared test database, which other tests use as it runs, is
// never touched. Each test that uses one gives its own suffix, so two can
// run at once.
import {
  checkTestDatabase,
  checkTestEnvironment,
  type TestDatabase,
} from "../../../scripts/test-db/test-database.ts";

// The scratch database: .env.test's name with suffix, on the same local
// server, checked as the test database is. It is not made here: the test
// resets it, and drops it at the end.
function scratchDatabase(suffix: string): TestDatabase {
  const testDatabase = checkTestEnvironment();
  const url = new URL(testDatabase.url);
  url.pathname = `/${testDatabase.name}${suffix}`;
  return checkTestDatabase(url.href);
}

export { scratchDatabase };
