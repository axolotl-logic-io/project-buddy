// `mise run //apps/web:db:reset [dev|server|system]`: drops this branch's
// database for that role, the development one by default, and makes it
// afresh with the checkout's migrations and no rows. The system test server
// script runs it before each Playwright run; the server tests' global setup
// resets their own.
import process from "node:process";
import { z } from "zod";
import { localDatabase } from "./database-names.ts";
import { resetDatabase } from "./local-databases.ts";

const ROLE = z.enum(["dev", "server", "system"]).default("dev");

const [role, ...rest] = process.argv.slice(2);
const parsed = ROLE.safeParse(role);
if (parsed.success && rest.length === 0) {
  await resetDatabase(localDatabase(parsed.data));
  console.log(
    `Reset the ${parsed.data} database ${localDatabase(parsed.data).name} and migrated it.`,
  );
} else {
  console.error("Usage: mise run //apps/web:db:reset [dev|server|system]");
  process.exitCode = 2;
}
