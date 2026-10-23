// `npm run test-db:reset` drops and recreates the database it is given, so it
// must refuse every environment that isn't this machine's test database with
// the mock tutor and the email outbox, before it connects to anything. Each
// test runs the real command, scripts/test-db/reset.ts, in its own Node
// process with only the environment it names (`real-dependency-tests`): no
// .env file is loaded, and no refusal case names a reachable database.
import { spawnSync } from "node:child_process";
import process from "node:process";
import { describe, expect, test } from "vitest";

const RESET = "scripts/test-db/reset.ts";
// Long enough for Node to start and refuse on a busy machine; a reset that
// got past the guard would instead wait on the network and fail this bound.
const RUN_TIMEOUT_MS = 20_000;

// A connection string for the database at host, with placeholder credentials.
function connectionString(host: string, database: string): string {
  const url = new URL(`postgres://${host}/${database}`);
  url.username = "app";
  url.password = "placeholder";
  return url.href;
}

const LOCAL_DATABASE = connectionString("localhost:4444", "project_buddy_e2e");

// One run of the reset command.
interface Run {
  readonly status: number | null;
  readonly stderr: string;
}

// The settings .env.test.example gives, each of which a test may change:
// a value replaces it, and undefined leaves it out.
interface Settings {
  readonly databaseUrl?: string | undefined;
  readonly tutorModel?: string | undefined;
  readonly emailTransport?: string | undefined;
  readonly emailOutboxDir?: string | undefined;
  readonly vercelEnv?: string | undefined;
}

const SAFE: Settings = {
  databaseUrl: LOCAL_DATABASE,
  tutorModel: "mock",
  emailTransport: "outbox",
  emailOutboxDir: "test-results/email-outbox",
};

// Each setting and its environment variable.
const VARIABLES: readonly (readonly [keyof Settings, string])[] = [
  ["databaseUrl", "DATABASE_URL"],
  ["tutorModel", "TUTOR_MODEL"],
  ["emailTransport", "EMAIL_TRANSPORT"],
  ["emailOutboxDir", "EMAIL_OUTBOX_DIR"],
  ["vercelEnv", "VERCEL_ENV"],
];

// Runs the reset command with SAFE changed by changes. `env -i` starts it
// with no environment but those settings, so nothing from this process or
// the developer's shell reaches it.
function reset(changes: Settings): Run {
  const settings: Settings = { ...SAFE, ...changes };
  const assignments = VARIABLES.flatMap(([setting, variable]) => {
    const value = settings[setting];
    if (value === undefined) {
      return [];
    }
    return [`${variable}=${value}`];
  });
  const run = spawnSync(
    "env",
    [
      "-i",
      ...assignments,
      process.execPath,
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      RESET,
    ],
    { encoding: "utf8", timeout: RUN_TIMEOUT_MS },
  );
  return { status: run.status, stderr: run.stderr };
}

// What a refused reset gives: an error whose message matches pattern, and
// exit status 1.
function refusal(pattern: RegExp): Run {
  return { status: 1, stderr: expect.stringMatching(pattern) };
}

const NOT_SET = /DATABASE_URL is not set.*\.env\.test/u;
const NEON = /a Neon database/u;
const NOT_LOCAL = /not on this machine/u;
const RESERVED = /reserved/u;
const PLAIN_NAME = /lowercase letters, digits and underscores/u;
const NOT_A_URL = /not a connection string/u;
const NO_NAME = /names no database.*test-db:\*.*\.env\.test/u;
const NOT_POSTGRES = /must be a Postgres connection string/u;
const DRIVER_OVERRIDE = /permits only sslmode and application_name/u;
const REPEATED_OPTION = /repeats a connection option/u;
const NO_CREDENTIALS = /user and password explicitly/u;
const TOO_LONG = /63-character identifier limit/u;
const NOT_MOCK = /TUTOR_MODEL is not "mock".*\.env\.test/u;
const MOCK_IN_PRODUCTION = /TUTOR_MODEL is "mock" in production/u;
const NOT_OUTBOX = /EMAIL_TRANSPORT is not "outbox".*\.env\.test/u;
const NO_OUTBOX_DIR = /EMAIL_OUTBOX_DIR is not set.*\.env\.test/u;
const MAX_IDENTIFIER_LENGTH = 63;

describe("the test database reset refuses", () => {
  test("a production-shaped URL from the Neon integration", () => {
    const production = `${connectionString(
      "ep-quiet-pond-123-pooler.eu-west-2.aws.neon.tech",
      "neondb",
    )}?sslmode=require`;

    expect(reset({ databaseUrl: production })).toEqual(refusal(NEON));
  });

  test("any other Neon database", () => {
    const branch = connectionString("ep-test-branch.neon.tech", "e2e");

    expect(reset({ databaseUrl: branch })).toEqual(refusal(NEON));
  });

  test("a database on another machine", () => {
    const remote = connectionString("db.example.com:5432", "e2e");

    expect(reset({ databaseUrl: remote })).toEqual(refusal(NOT_LOCAL));
  });

  test("DATABASE_URL missing or blank", () => {
    expect(reset({ databaseUrl: undefined })).toEqual(refusal(NOT_SET));
    expect(reset({ databaseUrl: "  " })).toEqual(refusal(NOT_SET));
  });

  test("a value that is not a URL", () => {
    expect(reset({ databaseUrl: "not a url" })).toEqual(refusal(NOT_A_URL));
  });

  test("raw delimiters that the driver parses differently from a Postgres URL", () => {
    const ambiguous = String.raw`postgres://remote.example\:placeholder@localhost:4444/pinned`;

    expect(reset({ databaseUrl: ambiguous })).toEqual(refusal(NOT_A_URL));
  });

  test("a non-Postgres scheme", () => {
    expect(reset({ databaseUrl: "https://localhost:4444/e2e" })).toEqual(
      refusal(NOT_POSTGRES),
    );
  });

  test("a driver routing override or another connection option", () => {
    for (const option of [
      "host=remote.example",
      "sslcert=/private/key",
      "options=-c%20search_path=other",
    ]) {
      expect(reset({ databaseUrl: `${LOCAL_DATABASE}?${option}` })).toEqual(
        refusal(DRIVER_OVERRIDE),
      );
    }
    expect(
      reset({
        databaseUrl: `${LOCAL_DATABASE}?sslmode=disable&sslmode=require`,
      }),
    ).toEqual(refusal(REPEATED_OPTION));
  });

  test("a connection string without the test server's credentials", () => {
    expect(reset({ databaseUrl: "postgres://localhost:4444/e2e" })).toEqual(
      refusal(NO_CREDENTIALS),
    );
  });

  test("the server's own databases, which a reset must not drop", () => {
    for (const name of [
      "postgres",
      "main",
      "template0",
      "template1",
      "ma%69n",
    ]) {
      const own = connectionString("localhost:4444", name);

      expect(reset({ databaseUrl: own })).toEqual(refusal(RESERVED));
    }
  });

  test("a server with no database supplied", () => {
    const server = connectionString("localhost:4444", "");

    expect(reset({ databaseUrl: server })).toEqual(refusal(NO_NAME));
  });

  test("a database name SQL would quote, or Postgres would truncate", () => {
    const quoted = connectionString("localhost:4444", "Project-Buddy");
    const truncated = connectionString(
      "localhost:4444",
      `${"a".repeat(MAX_IDENTIFIER_LENGTH)}_other`,
    );

    expect(reset({ databaseUrl: quoted })).toEqual(refusal(PLAIN_NAME));
    expect(reset({ databaseUrl: truncated })).toEqual(refusal(TOO_LONG));
  });

  test("the tutor on Claude, or unset, which means Claude", () => {
    expect(reset({ tutorModel: undefined })).toEqual(refusal(NOT_MOCK));
    expect(reset({ tutorModel: "claude" })).toEqual(refusal(NOT_MOCK));
  });

  test("a production deployment", () => {
    expect(reset({ vercelEnv: "production" })).toEqual(
      refusal(MOCK_IN_PRODUCTION),
    );
  });

  test("email that doesn't go to the outbox's folder", () => {
    expect(reset({ emailTransport: undefined })).toEqual(refusal(NOT_OUTBOX));
    expect(reset({ emailTransport: "resend" })).toEqual(refusal(NOT_OUTBOX));
    expect(reset({ emailOutboxDir: " " })).toEqual(refusal(NO_OUTBOX_DIR));
  });
});
