// The server tests' global setup (vitest.server.config.mts): empties this
// branch's server test database and gives it the checkout's migrations,
// once, before any test file runs.
import { localDatabase } from "./scripts/db/database-names.ts";
import { resetDatabase } from "./scripts/db/local-databases.ts";

async function setup(): Promise<void> {
  await resetDatabase(localDatabase("server"));
}

export default setup;
