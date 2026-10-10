// Rebuilds the manual_sections table from the manual's release branch.
// Run with `npm run manual:reindex`.
import { reindexManual } from "../src/manual/reindex-manual.ts";

await reindexManual();
