// The `npm run manual:reindex` command: rebuilds the manual_sections table
// from the manual's release branch. As the command's entry point, it is the
// one place that reads the environment and prints to the terminal.

import { reindexManual } from "../src/blender-manual/reindex-manual.ts";
import { readDatabaseUrl } from "../src/env.ts";

await reindexManual(readDatabaseUrl(), (line) => {
  console.log(line);
});
