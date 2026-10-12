// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { checkSignUpPassphrase } from "@/app/signup/passphrase.ts";
import { MAX_FAILED_LOGINS } from "@/auth/failed-logins.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
} from "@/db/fake-neon-http.ts";

const PASSPHRASE = "open sesame";
const CLIENT = "203.0.113.7";
const REQUEST_HEADERS = new Headers({ "x-forwarded-for": CLIENT });
const NO_ROWS: NeonHttpAnswer = { kind: "rows", columns: [], rows: [] };
const MS_PER_MINUTE = 60_000;

// The client's failed-login count, in a window that started a minute ago.
function failures(count: number): NeonHttpAnswer {
  return {
    kind: "rows",
    columns: [
      { name: "failures", type: "int4" },
      { name: "window_started_at", type: "timestamptz" },
    ],
    rows: [[String(count), new Date(Date.now() - MS_PER_MINUTE).toISOString()]],
  };
}

function database(...answers: readonly NeonHttpAnswer[]): FakeNeonHttp {
  const [first = NO_ROWS, ...later] = answers;
  const neonHttp = fakeNeonHttp(first, ...later);
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  vi.stubEnv("SITE_PASSPHRASE", PASSPHRASE);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("checkSignUpPassphrase", () => {
  test("takes the right passphrase, clearing the client's count", async () => {
    const neonHttp = database(NO_ROWS, NO_ROWS);

    expect(await checkSignUpPassphrase(PASSPHRASE, REQUEST_HEADERS)).toBe(
      "right",
    );
    expect(neonHttp.queries[1]?.query).toContain('delete from "failed_logins"');
    expect(neonHttp.queries[1]?.params).toEqual([CLIENT]);
  });

  test("refuses a wrong passphrase, counting it against the client", async () => {
    const neonHttp = database(failures(1), NO_ROWS);

    expect(await checkSignUpPassphrase("guess", REQUEST_HEADERS)).toBe("wrong");
    expect(neonHttp.queries[1]?.query).toContain('insert into "failed_logins"');
    expect(neonHttp.queries[1]?.params).toContain(CLIENT);
  });

  test("refuses even the right passphrase from a locked-out client", async () => {
    const neonHttp = database(failures(MAX_FAILED_LOGINS));

    expect(await checkSignUpPassphrase(PASSPHRASE, REQUEST_HEADERS)).toBe(
      "locked-out",
    );
    expect(neonHttp.queries).toHaveLength(1);
  });
});
