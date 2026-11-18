import {
  execFile,
  type SpawnSyncOptionsWithStringEncoding,
  spawn,
  spawnSync,
} from "node:child_process";
import { once } from "node:events";
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
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it as test } from "vitest";

const SERVER_EXIT_TIMEOUT_MS = 12_000;
const SERVER_READY_TIMEOUT_MS = 2000;
const SECRET_MODE = 0o600;
const FILE_MODE_RANGE = 0o1000;
const SESSION_SETTING = /SESSION_SECRET=\S+/u;
const OWN_DATABASE =
  /^DATABASE_URL=postgres:\/\/postgres:postgres@127\.0\.0\.1:5434\/pb_dev_[\da-f]{12}$/mu;
const DATABASE_STEP =
  /^npm run --silent dev:database DATABASE_URL=postgres:\/\/postgres:postgres@127\.0\.0\.1:5434\/pb_dev_[\da-f]{12}$/mu;
const DATABASE_SETTING = /DATABASE_URL=\S+/u;
let root: string;
let web: string;
let bin: string;

const execFileAsync = promisify(execFile);

function commandOptions(): SpawnSyncOptionsWithStringEncoding {
  return {
    cwd: root,
    encoding: "utf8",
    timeout: 10_000,
    env: {
      PATH: `${bin}:/usr/bin:/bin:/usr/sbin`,
      NODE_NO_WARNINGS: "1",
      NODE_ENV: "development",
    },
  };
}

function run(action: string, ...args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync(
    process.execPath,
    [join(web, "scripts/development/run.ts"), action, ...args],
    commandOptions(),
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
      "Preparing this worktree's development database (npm run dev:database)",
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
    expect(commands).toContain("npm run --silent dev:database");
    expect(commands).toContain("npm run dev:cli-session");
    const lines = commands.split("\n");
    expect(lines.indexOf("npm run test-env:init")).toBeLessThan(
      lines.indexOf("npm run test-db:up"),
    );
    expect(lines.indexOf("npm run test-db:up")).toBeLessThan(
      lines.indexOf("npm run test-db:reset"),
    );
    expect(commands).toContain("npm run browsers:install");
    expect(commands).not.toContain("compose.test-db.yml down");
  });

  test("stops the checkout's development server before reinstalling dependencies", async () => {
    const devOutput = join(web, ".next/dev");
    mkdirSync(devOutput, { recursive: true });
    const server = spawn(
      process.execPath,
      [
        "-e",
        `process.title = "next-server (v0.0.0)";
        require("node:fs").writeFileSync(".next/dev/lock", JSON.stringify({ pid: process.pid }));
        process.on("SIGTERM", () => {
          require("node:fs").writeFileSync(".next/dev/stopped", "");
          process.exit(0);
        });
        console.log("ready");
        setInterval(() => {}, 1000);`,
      ],
      { cwd: web },
    );
    const exited = once(server, "exit", {
      signal: AbortSignal.timeout(SERVER_EXIT_TIMEOUT_MS),
    }).catch(() => undefined);
    try {
      await once(server.stdout, "data", {
        signal: AbortSignal.timeout(SERVER_READY_TIMEOUT_MS),
      });
      writeFileSync(
        join(bin, "npm"),
        '#!/bin/sh\nif [ "$1" = ci ]; then test -f apps/web/.next/dev/stopped; fi\n',
        { mode: 0o755 },
      );
      await execFileAsync(
        process.execPath,
        [join(web, "scripts/development/run.ts"), "setup"],
        commandOptions(),
      );
      await expect(exited).resolves.toEqual([0, null]);
    } finally {
      server.kill();
      await exited;
    }
  });

  test("keeps the development database's settings from the test database commands", () => {
    writeFileSync(
      join(bin, "npm"),
      '#!/bin/sh\nprintf "npm %s DATABASE_URL=%s\\n" "$*" "$DATABASE_URL" >> commands\n',
      { mode: 0o755 },
    );
    expect(run("setup").status).toBe(0);
    const commands = readFileSync(join(web, "commands"), "utf8");
    expect(commands).toMatch(DATABASE_STEP);
    expect(commands).toContain("npm run test-db:up DATABASE_URL=\n");
    expect(commands).toContain("npm run test-db:reset DATABASE_URL=\n");
  });

  test("refuses an explicit hosted development database before installing dependencies or changing configuration", () => {
    const file = join(web, ".env.development.local");
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
      "dev:database",
    );
  });

  test.each(["postgres", "postgresql"])(
    "uses a local development override for a pulled %s configuration",
    (protocol) => {
      const file = join(web, ".env.local");
      const contents = `# pulled configuration\nDATABASE_URL="${protocol}://example.invalid/project"\nSESSION_SECRET=kept\n`;
      writeFileSync(file, contents);
      const developmentFile = join(web, ".env.development.local");
      writeFileSync(
        developmentFile,
        "# mine\nEMAIL_OUTBOX_DIR=custom-outbox\n",
      );
      const diagnosis = run("doctor");
      expect(diagnosis.status).toBe(1);
      expect(readFileSync(developmentFile, "utf8")).toBe(
        "# mine\nEMAIL_OUTBOX_DIR=custom-outbox\n",
      );
      const result = run("setup");
      expect(result.status).toBe(0);
      expect(readFileSync(file, "utf8")).toBe(contents);
      const updated = readFileSync(developmentFile, "utf8");
      expect(updated).toContain("EMAIL_OUTBOX_DIR=custom-outbox");
      expect(updated).toMatch(OWN_DATABASE);
      expect(updated).toContain("EMAIL_TRANSPORT=outbox");
      expect(updated).not.toContain("SESSION_SECRET=");
      expect(String(result.stdout)).not.toContain("example.invalid");
      expect(run("setup").status).toBe(0);
      expect(readFileSync(developmentFile, "utf8")).toBe(updated);
      expect(readFileSync(file, "utf8")).toBe(contents);
    },
  );

  test("does not replace another worktree's or the test database's local settings", () => {
    const file = join(web, ".env.local");
    const contents = "DATABASE_URL=postgres://127.0.0.1:5433/test_database\n";
    writeFileSync(file, contents);
    expect(run("setup").status).toBe(1);
    expect(readFileSync(file, "utf8")).toBe(contents);
    expect(existsSync(join(web, ".env.development.local"))).toBe(false);
  });

  test("moves a worktree off the shared development database and keeps its other settings", () => {
    const file = join(web, ".env.local");
    const shared = new URL("postgres://127.0.0.1:5434/project_buddy_dev");
    shared.username = "postgres";
    shared.password = "postgres";
    const line = `DATABASE_URL=${shared.href}`;
    writeFileSync(file, `# mine\n${line}\nSESSION_SECRET=kept\n`);
    expect(run("doctor").stdout).toContain("its own development database");
    expect(run("setup").status).toBe(0);
    const updated = readFileSync(file, "utf8");
    expect(updated).not.toContain(line);
    expect(updated.startsWith("# mine\nDATABASE_URL=")).toBe(true);
    expect(updated).toMatch(OWN_DATABASE);
    expect(updated).toContain("\nSESSION_SECRET=kept\n");
  });

  test("rejects hosted opt-in and unknown setup flags before changing configuration", () => {
    const file = join(web, ".env.local");
    const contents = "DATABASE_URL=postgres://example.invalid/project\n";
    writeFileSync(file, contents);
    for (const flag of ["--hosted", "--unknown"]) {
      const result = run("setup", flag);
      expect(result.status).toBe(1);
      expect(String(result.stderr)).toContain("Usage:");
      expect(readFileSync(file, "utf8")).toBe(contents);
      expect(existsSync(join(web, ".env.development.local"))).toBe(false);
      expect(existsSync(join(root, "commands"))).toBe(false);
      expect(existsSync(join(web, "commands"))).toBe(false);
    }
  });

  test("gives each worktree its own development database", () => {
    expect(run("setup").status).toBe(0);
    const first = readFileSync(join(web, ".env.local"), "utf8");
    const other = join(root, "other/apps/web");
    mkdirSync(join(other, ".."), { recursive: true });
    cpSync(web, other, { recursive: true });
    rmSync(join(other, ".env.local"));
    web = other;
    expect(run("setup").status).toBe(0);
    const second = readFileSync(join(other, ".env.local"), "utf8");
    expect(DATABASE_SETTING.exec(first)?.[0]).not.toBe(
      DATABASE_SETTING.exec(second)?.[0],
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

  test("stops setup when the test database can't be migrated", () => {
    writeFileSync(
      join(bin, "npm"),
      '#!/bin/sh\nif [ "$2" = test-db:reset ]; then exit 1; fi\nprintf "npm %s\\n" "$*" >> commands\n',
      { mode: 0o755 },
    );
    const result = run("setup");
    expect(result.status).toBe(1);
    expect(String(result.stderr)).toContain("Test database");
    expect(readFileSync(join(web, "commands"), "utf8")).not.toContain(
      "browsers:install",
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

  test("sign-in-link refuses a non-address, and asks for setup without configuration", () => {
    const notAnAddress = run("sign-in-link", "someone");
    expect(notAnAddress.status).toBe(1);
    expect(String(notAnAddress.stderr)).toContain("isn't an email address");
    const unconfigured = run("sign-in-link", "dev@example.test");
    expect(unconfigured.status).toBe(1);
    expect(String(unconfigured.stderr)).toContain("Run mise setup first.");
    expect(run("sign-in-link", "a@example.test", "b@example.test").status).toBe(
      1,
    );
  });
});
