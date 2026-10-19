// The `npm run test-db:reindex` command: rebuilds the manual index in the
// end-to-end test database that .env.test names, never in production. As the
// command's entry point, it is the one place here that prints to the terminal.
import { reindexManual } from "../../src/manual/reindex-manual.ts";
import { checkPinnedTestDatabase } from "./run-environment.ts";
import { checkTestEnvironment } from "./test-database.ts";

await reindexManual(
  checkPinnedTestDatabase(checkTestEnvironment().url).url,
  (line) => {
    console.log(line);
  },
);
