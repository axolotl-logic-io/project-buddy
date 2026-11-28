import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { ACTION, defaultSampleCount, OPTIONS, PAGE } from "./options.ts";

const { values } = parseArgs({
  options: {
    page: { type: "string" },
    action: { type: "string" },
    performance: { type: "boolean" },
    profile: { type: "string" },
    samples: { type: "string" },
    compare: { type: "string" },
    help: { type: "boolean" },
  },
});

if (values.help === true) {
  process.stdout.write(
    `mise run //apps/web:audit [--page NAME] [--profile phone|desktop] [--samples N] [--compare DIR]
mise run //apps/web:audit:performance [--page NAME | --action NAME] [--profile phone|desktop] [--samples N] [--compare DIR]
Pages: ${PAGE.options.join(", ")}
Actions: ${ACTION.options.join(", ")}
`,
  );
} else {
  const options = OPTIONS.safeParse(values);
  if (!options.success) {
    process.stderr.write(`${options.error.message}\n`);
    process.exitCode = 1;
  } else if (
    options.data.action !== undefined &&
    (!options.data.performance || options.data.page !== undefined)
  ) {
    process.stderr.write(
      "--action requires audit:performance and cannot be used with --page.\n",
    );
    process.exitCode = 1;
  } else {
    const directory = mkdtempSync(join(tmpdir(), "project-buddy-audit-"));
    const run = spawnSync(
      process.execPath,
      [
        "../../node_modules/@playwright/test/cli.js",
        "test",
        "--config=playwright.audit.config.ts",
      ],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          BUDDY_AUDIT: JSON.stringify({
            ...options.data,
            directory,
            samples:
              options.data.samples ??
              defaultSampleCount(options.data.performance),
          }),
        },
      },
    );
    if (run.error !== undefined) {
      throw run.error;
    }
    process.exitCode = run.status ?? 1;
  }
}
