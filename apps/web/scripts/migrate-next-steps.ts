// Explicit operational entry point; default is a read-only preview.

import process from "node:process";
import { migrateNextSteps } from "../src/memory/migrate-next-steps.ts";

const apply = process.argv.includes("--apply");
if (apply && !process.argv.includes("--plan-release-live")) {
  throw new Error(
    "Confirm the plan-reading release is live with --plan-release-live",
  );
}
console.log({ apply, quests: await migrateNextSteps(!apply) });
