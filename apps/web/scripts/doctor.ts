// `mise run doctor`: checks the development prerequisites, the local
// settings and this branch's development database, changing nothing.
import { existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import {
  configurationProblems,
  localSettings,
} from "./development/environment.ts";
import {
  command,
  prerequisites,
  ROOT,
  reportFailure,
  WEB_ROOT,
} from "./development/steps.ts";

let healthy = true;

function report(ok: boolean, message: string): void {
  let prefix = "OK";
  if (!ok) {
    healthy = false;
    prefix = "FAIL";
  }
  console.log(`${prefix}: ${message}`);
}

// Imports pg, so it runs only once dependencies are installed.
async function checkDatabase(): Promise<void> {
  const [{ localDatabase }, { migrationState }] = await Promise.all([
    import("./db/database-names.ts"),
    import("./db/migrate.ts"),
  ]);
  try {
    const state = await migrationState(localDatabase("dev"));
    if (state === "diverged") {
      report(
        false,
        "This branch's development database has migrations this checkout lacks. Run mise run //apps/web:db:migrate to reset it; its data is lost.",
      );
    } else if (state === "pending") {
      report(
        false,
        "Development database reachable; migrations pending. Run mise run //apps/web:db:migrate.",
      );
    } else {
      report(true, "Development database reachable; migrations are current.");
    }
  } catch {
    report(
      false,
      "Development database unavailable: run mise run setup and check Docker. Database credentials are not printed.",
    );
  }
}

async function doctor(): Promise<void> {
  for (const [ok, message] of prerequisites()) {
    report(ok, message);
  }
  const dependencies =
    existsSync(join(ROOT, "node_modules", ".package-lock.json")) &&
    command("npm", ["ls", "--depth=0", "--workspaces"], { cwd: ROOT });
  report(
    dependencies,
    "Workspace dependencies: run mise run setup to install.",
  );
  const problems = configurationProblems(localSettings(WEB_ROOT, process.env));
  report(
    problems.length === 0,
    "Local configuration: run mise run setup first.",
  );
  for (const problem of problems) {
    report(false, problem);
  }
  if (dependencies) {
    await checkDatabase();
  } else {
    console.log("SKIP: The database check needs the dependencies.");
  }
  if (!healthy) {
    process.exitCode = 1;
  }
}

await doctor().catch(reportFailure);
