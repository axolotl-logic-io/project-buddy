// `mise run setup` and `mise run doctor`, run from a copy of their scripts
// with fake docker, npm and mise, so nothing is installed or started.
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
const EXECUTABLE = 0o755;
const SESSION_SETTING = /SESSION_SECRET=\S+/u;
// Each fake tool logs its command line to `commands` in its working folder.
const LOGGING_TOOL =
  '#!/bin/sh\nprintf "%s %s\\n" "$(basename "$0")" "$*" >> commands\n';
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

function tool(name: string, script: string): void {
  writeFileSync(join(bin, name), script, { mode: EXECUTABLE });
}

function run(
  task: "setup" | "doctor",
  ...args: string[]
): ReturnType<typeof spawnSync> {
  return spawnSync(
    process.execPath,
    [join(web, `scripts/${task}.ts`), ...args],
    commandOptions(),
  );
}

function logged(folder: string): string {
  const file = join(folder, "commands");
  if (!existsSync(file)) {
    return "";
  }
  return readFileSync(file, "utf8");
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "buddy-development-"));
  web = join(root, "apps/web");
  bin = join(root, "bin");
  mkdirSync(bin, { recursive: true });
  mkdirSync(join(web, "scripts"), { recursive: true });
  cpSync(resolve("scripts/development"), join(web, "scripts/development"), {
    recursive: true,
  });
  for (const task of ["setup", "doctor"]) {
    cpSync(resolve(`scripts/${task}.ts`), join(web, `scripts/${task}.ts`));
  }
  for (const name of ["docker", "npm", "mise"]) {
    tool(name, LOGGING_TOOL);
  }
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("mise run setup", () => {
  test("installs, starts the servers, migrates and installs browsers, in order", () => {
    const result = run("setup");
    expect(result.status).toBe(0);
    expect(logged(root)).toContain("npm ci");
    const steps = logged(web)
      .split("\n")
      .filter((line) => line.startsWith("mise "));
    expect(steps).toEqual([
      "mise run //apps/web:db:up",
      "mise run //apps/web:db:migrate",
      "mise run //apps/web:browsers:install",
    ]);
  });

  test("adds local sign-in settings once and keeps them on repeat runs", () => {
    expect(run("setup").status).toBe(0);
    const file = join(web, ".env.local");
    const original = readFileSync(file, "utf8");
    expect(original).toContain("EMAIL_TRANSPORT=outbox");
    expect(original).toMatch(SESSION_SETTING);
    expect(original).not.toContain("DATABASE_URL");
    expect(statSync(file).mode % FILE_MODE_RANGE).toBe(SECRET_MODE);
    writeFileSync(file, `${original}\n# keep my settings\n`);
    expect(run("setup").status).toBe(0);
    expect(readFileSync(file, "utf8")).toBe(
      `${original}\n# keep my settings\n`,
    );
  });

  test("fills missing settings without replacing or printing existing values", () => {
    const file = join(web, ".env.local");
    const original =
      "# existing configuration\nSESSION_SECRET=existing-local-session-value\nEMAIL_OUTBOX_DIR=custom-outbox\nEMAIL_TRANSPORT=\n";
    writeFileSync(file, original);
    const result = run("setup");
    expect(result.status).toBe(0);
    const updated = readFileSync(file, "utf8");
    expect(updated.startsWith(original)).toBe(true);
    expect(updated).toContain("EMAIL_TRANSPORT=outbox");
    expect(updated).not.toContain(
      "EMAIL_OUTBOX_DIR=test-results/dev-email-outbox",
    );
    expect(String(result.stdout)).not.toContain("existing-local-session-value");
  });

  // `mise run dev` always serves this branch's database, so a DATABASE_URL
  // pulled from Vercel is harmless and stays as it was.
  test("leaves a pulled DATABASE_URL alone and never prints it", () => {
    const file = join(web, ".env.local");
    const contents =
      '# pulled configuration\nDATABASE_URL="postgres://example.invalid/project"\nSESSION_SECRET=kept\n';
    writeFileSync(file, contents);
    const result = run("setup");
    expect(result.status).toBe(0);
    const updated = readFileSync(file, "utf8");
    expect(updated.startsWith(contents)).toBe(true);
    expect(updated.slice(contents.length)).not.toContain("SESSION_SECRET=");
    expect(String(result.stdout)).not.toContain("example.invalid");
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
      tool(
        "npm",
        '#!/bin/sh\nif [ "$1" = ci ]; then test -f apps/web/.next/dev/stopped; fi\n',
      );
      await execFileAsync(
        process.execPath,
        [join(web, "scripts/setup.ts")],
        commandOptions(),
      );
      await expect(exited).resolves.toEqual([0, null]);
    } finally {
      server.kill();
      await exited;
    }
  });

  test("rejects arguments before changing anything", () => {
    const result = run("setup", "--hosted");
    expect(result.status).toBe(1);
    expect(String(result.stderr)).toContain("Usage: mise run setup");
    expect(existsSync(join(web, ".env.local"))).toBe(false);
    expect(logged(root)).toBe("");
    expect(logged(web)).toBe("");
  });

  test("stops on a failed dependency install before starting the servers", () => {
    tool("npm", '#!/bin/sh\nif [ "$1" = ci ]; then exit 1; fi\n');
    const result = run("setup");
    expect(result.status).toBe(1);
    expect(String(result.stderr)).toContain("Dependency install");
    expect(logged(web)).not.toContain("mise ");
  });

  test("stops when the development database can't be migrated", () => {
    tool(
      "mise",
      `#!/bin/sh\nif [ "$2" = //apps/web:db:migrate ]; then exit 1; fi\n${LOGGING_TOOL.slice("#!/bin/sh\n".length)}`,
    );
    const result = run("setup");
    expect(result.status).toBe(1);
    expect(String(result.stderr)).toContain("Development database");
    expect(logged(web)).not.toContain("browsers:install");
  });

  test("reports a stopped Docker engine without creating configuration", () => {
    tool("docker", "#!/bin/sh\nexit 1\n");
    const setup = run("setup");
    expect(setup.status).toBe(1);
    expect(String(setup.stderr)).toContain("Docker engine");
    expect(existsSync(join(web, ".env.local"))).toBe(false);
  });
});

describe("mise run doctor", () => {
  test("collects configuration and dependency problems without changing anything", () => {
    tool("docker", "#!/bin/sh\nexit 1\n");
    const result = run("doctor");
    expect(result.status).toBe(1);
    const output = String(result.stdout);
    expect(output).toContain("FAIL: Docker engine");
    expect(output).toContain("FAIL: Workspace dependencies");
    expect(output).toContain("SESSION_SECRET");
    expect(output).toContain("EMAIL_TRANSPORT=outbox");
    expect(output).toContain("SKIP: The database check");
    expect(existsSync(join(web, ".env.local"))).toBe(false);
    expect(logged(root)).not.toContain("npm ci");
    expect(logged(web)).not.toContain("mise ");
  });
});
