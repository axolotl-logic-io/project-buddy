// The smoke test command of the release and integration workflows:
// `node scripts/release/smoke.ts <base url>`. A protected preview needs
// VERCEL_AUTOMATION_BYPASS_SECRET in the environment. Prints each failed check and
// exits with status 1 if any failed. As the command's entry point, it is the
// one place here that prints to the terminal.
import { argv, exit } from "node:process";
import { readVercelBypassSecretIfSet } from "../../src/env.ts";
import { smokeChecks, withProtectionBypass } from "./smoke-checks.ts";

const [, , baseUrl]: readonly (string | undefined)[] = argv;
if (baseUrl === undefined) {
  console.error("Usage: node scripts/release/smoke.ts <base url>");
  exit(2);
}

const failures: string[] = await smokeChecks(
  baseUrl,
  withProtectionBypass(fetch, readVercelBypassSecretIfSet()),
);
for (const failure of failures) {
  console.error(`Smoke check failed: ${failure}`);
}
if (failures.length > 0) {
  exit(1);
}
console.log(`Every smoke check passed against ${baseUrl}.`);
