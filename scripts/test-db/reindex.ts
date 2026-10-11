// The `npm run test-db:reindex` command: rebuilds the manual index in the
// end-to-end test database that .env.test names, never in production. As the
// command's entry point, it is the one place here that prints to the terminal.
import { reindexManual } from "../../src/manual/reindex-manual.ts";
import { readTestDatabase } from "./test-database.ts";

await reindexManual(readTestDatabase().url, (line) => {
  console.log(line);
});
