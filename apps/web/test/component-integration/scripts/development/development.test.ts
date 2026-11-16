import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { afterEach, beforeEach, describe, expect, it as test } from "vitest";

const SECRET_MODE = 0o600;
const FILE_MODE_RANGE = 0o1000;
const SESSION_SETTING = /SESSION_SECRET=\S+/u;
let root: string;
let web: string;
let bin: string;

function run(action: string): ReturnType<typeof spawnSync> {
  return spawnSync(
    process.execPath,
    [join(web, "scripts/development/run.ts"), action],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
      env: {
        PATH: `${bin}:/usr/bin:/bin`,
        NODE_NO_WARNINGS: "1",
        NODE_ENV: "development",
      },
    },
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "buddy-development-"));
  web = join(root, "apps/web");
  bin = join(root, "bin");
  mkdirSync(bin, { recursive: true });
  mkdirSync(web, { recursive: true });
  cpSync(resolve("scripts/development"), join(web, "scripts/development"), {
    recursive: true,
  });
  // Fake platform tools exercise the real command without Docker or network.
  writeFileSync(
    join(bin, "docker"),
    '#!/bin/sh\nprintf "docker %s\\n" "$*" >> commands\n',
    { mode: 0o755 },
  );
  writeFileSync(
    join(bin, "npm"),
    '#!/bin/sh\nprintf "npm %s\\n" "$*" >> commands\n',
    { mode: 0o755 },
  );
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("development setup and diagnosis", () => {
  test("prepares local sign-in and migrations and preserves configuration on repeat runs", () => {
    const result = run("setup");
    expect(result.status).toBe(0);
    expect(String(result.stdout)).toContain(
      "Applying development migrations (npm run db:migrate)",
    );
    const file = join(web, ".env.local");
    const original = readFileSync(file, "utf8");
    expect(original).toContain("EMAIL_TRANSPORT=outbox");
    expect(original).toMatch(SESSION_SETTING);
    expect(statSync(file).mode % FILE_MODE_RANGE).toBe(SECRET_MODE);
    writeFileSync(file, `${original}\n# keep my settings\n`);
    expect(run("setup").status).toBe(0);
    expect(readFileSync(file, "utf8")).toBe(
      `${original}\n# keep my settings\n`,
    );
    expect(readFileSync(join(root, "commands"), "utf8")).toContain("npm ci");
    const commands = readFileSync(join(web, "commands"), "utf8");
    expect(commands).toContain("up --detach --wait");
    expect(commands).toContain("npm run db:migrate");
    expect(commands).toContain("npm run test-env:init");
    expect(commands).not.toContain("reset");
  });

  test("refuses a hosted database before installing dependencies or changing configuration", () => {
    const file = join(web, ".env.local");
    const contents = "DATABASE_URL=postgres://example.invalid/project\n";
    writeFileSync(file, contents);
    const result = run("setup");
    expect(result.status).toBe(1);
    expect(String(result.stderr)).toContain("refuse other databases");
    expect(String(result.stderr)).not.toContain("example.invalid");
    expect(readFileSync(file, "utf8")).toBe(contents);
    expect(existsSync(join(root, "commands"))).toBe(true);
    expect(readFileSync(join(root, "commands"), "utf8")).not.toContain(
      "npm ci",
    );
    expect(readFileSync(join(web, "commands"), "utf8")).not.toContain(
      "db:migrate",
    );
  });

  test("also refuses a higher-priority development database override", () => {
    expect(run("setup").status).toBe(0);
    writeFileSync(
      join(web, ".env.development.local"),
      "DATABASE_URL=postgres://example.invalid/project\n",
    );
    const result = run("setup");
    expect(result.status).toBe(1);
    expect(String(result.stderr)).toContain("refuse other databases");
  });

  test("collects missing configuration and dependency problems without creating environment files", () => {
    const result = run("doctor");
    expect(result.status).toBe(1);
    const output = String(result.stdout);
    expect(output).toContain("FAIL: Workspace dependencies");
    expect(output).toContain("SESSION_SECRET");
    expect(output).toContain("EMAIL_TRANSPORT=outbox");
    expect(existsSync(join(web, ".env.local"))).toBe(false);
    expect(readFileSync(join(root, "commands"), "utf8")).not.toContain(
      "npm ci",
    );
    expect(readFileSync(join(web, "commands"), "utf8")).not.toContain(
      "up --detach",
    );
  });

  test("stops setup on failed dependency installation before starting the database", () => {
    writeFileSync(
      join(bin, "npm"),
      '#!/bin/sh\nif [ "$1" = ci ]; then exit 1; fi\n',
      { mode: 0o755 },
    );
    const result = run("setup");
    expect(result.status).toBe(1);
    expect(String(result.stderr)).toContain("Dependency install");
    expect(readFileSync(join(web, "commands"), "utf8")).not.toContain(
      "up --detach",
    );
  });
  test("reports a stopped Docker engine without creating configuration", () => {
    writeFileSync(join(bin, "docker"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    const setup = run("setup");
    expect(setup.status).toBe(1);
    expect(String(setup.stderr)).toContain("Docker engine");
    expect(existsSync(join(web, ".env.local"))).toBe(false);
    const doctor = run("doctor");
    expect(doctor.status).toBe(1);
    expect(String(doctor.stdout)).toContain("FAIL: Docker engine");
    expect(String(doctor.stdout)).toContain("FAIL: Workspace dependencies");
  });
  test("fills missing settings in an existing environment without replacing its values", () => {
    const file = join(web, ".env.local");
    const original =
      "# existing configuration\nDATABASE_URL=\nSESSION_SECRET=existing-local-session-value\nEMAIL_OUTBOX_DIR=custom-outbox\nEMAIL_TRANSPORT=\n";
    writeFileSync(file, original);
    const result = run("setup");
    expect(result.status).toBe(0);
    const updated = readFileSync(file, "utf8");
    expect(updated.startsWith(original)).toBe(true);
    expect(updated).toContain("EMAIL_TRANSPORT=outbox");
    expect(updated).not.toContain(
      "EMAIL_OUTBOX_DIR=test-results/dev-email-outbox",
    );
    expect(updated).not.toContain("Development command failed");
    expect(String(result.stdout)).not.toContain("existing-local-session-value");
    expect(run("setup").status).toBe(0);
    expect(readFileSync(file, "utf8")).toBe(updated);
  });
});
