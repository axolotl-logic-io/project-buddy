import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { OPTIONS, PAGE } from "./options.ts";

const { values } = parseArgs({
  options: {
    page: { type: "string" },
    profile: { type: "string" },
    samples: { type: "string" },
    compare: { type: "string" },
    help: { type: "boolean" },
  },
});

if (values.help === true) {
  process.stdout.write(
    `npm run audit -- [--page NAME] [--profile phone|desktop] [--samples N] [--compare DIR]\nPages: ${PAGE.options.join(", ")}\n`,
  );
} else {
  const options = OPTIONS.safeParse(values);
  if (options.success) {
    const directory = mkdtempSync(join(tmpdir(), "project-buddy-audit-"));
    const run = spawnSync(
      process.execPath,
      [
        "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
        "../../node_modules/@playwright/test/cli.js",
        "test",
        "--config=playwright.audit.config.ts",
      ],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          BUDDY_AUDIT: JSON.stringify({ ...options.data, directory }),
        },
      },
    );
    if (run.error !== undefined) {
      throw run.error;
    }
    process.exitCode = run.status ?? 1;
  } else {
    process.stderr.write(`${options.error.message}\n`);
    process.exitCode = 1;
  }
}
