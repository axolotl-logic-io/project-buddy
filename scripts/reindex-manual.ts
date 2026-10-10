// Rebuilds the manual_sections table from the manual's release branch.
// Run with `npm run manual:reindex`.
import { stdout } from "node:process";
import { reindexManual } from "../src/manual/reindex-manual.ts";

await reindexManual((line) => {
  stdout.write(`${line}\n`);
});
