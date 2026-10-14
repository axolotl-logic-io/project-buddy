// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  clearWrongInviteCodes,
  countWrongInviteCode,
  isLockedOutOfInviteCode,
} from "@/accounts/rate-limits.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
} from "@/db/fake-neon-http.ts";
import { AppError } from "@/errors/app-error.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";

const NOW = new Date("2026-10-12T12:00:00.000Z");
const FIFTEEN_MINUTES_AGO = "2026-10-12T11:45:00.000Z";
const CLIENT = "203.0.113.7";
// The lockout's limit in use-cases/access.md.
const WRONG_CODES = 5;
const NO_ROWS: NeonHttpAnswer = { kind: "rows", columns: [], rows: [] };

function answering(...answers: readonly NeonHttpAnswer[]): FakeNeonHttp {
  const [first = NO_ROWS, ...later] = answers;
  const neonHttp = fakeNeonHttp(first, ...later);
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("reading the invite-code lockout", () => {
  test("locks out a client with too many wrong codes in the window", async () => {
    const neonHttp = answering({
      kind: "rows",
      columns: [{ name: "key", type: "text" }],
      rows: [[`wrong-invite-code:${CLIENT}`]],
    });

    expect(await isLockedOutOfInviteCode(CLIENT, NOW)).toBe(true);
    const [query] = neonHttp.queries;
    expect(query?.query).toContain('"rate_limits"."count" >=');
    expect(query?.params).toEqual([
      `wrong-invite-code:${CLIENT}`,
      String(WRONG_CODES),
      FIFTEEN_MINUTES_AGO,
    ]);
  });

  test("allows a client the database finds no such row for", async () => {
    answering(NO_ROWS);

    expect(await isLockedOutOfInviteCode(CLIENT, NOW)).toBe(false);
  });

  test("throws the storage case, logged under its operation, when the database is unreachable", async () => {
    const log = spyOnErrorLog();
    answering({ kind: "unreachable" });

    await expect(isLockedOutOfInviteCode(CLIENT, NOW)).rejects.toBeInstanceOf(
      AppError,
    );
    expect(log).toHaveBeenCalledWith(
      "[app-error] database-unreachable in read invite code lockout",
      expect.any(String),
    );
  });
});

describe("counting wrong invite codes", () => {
  test("counts a wrong code in the client's window, deleting rows whose windows have passed", async () => {
    const neonHttp = answering(NO_ROWS, NO_ROWS);

    await countWrongInviteCode(CLIENT, NOW);

    const [counting, deleting] = neonHttp.batches[0] ?? [];
    expect(counting?.query).toContain('insert into "rate_limits"');
    expect(counting?.params).toContain(`wrong-invite-code:${CLIENT}`);
    expect(counting?.params).toContain(FIFTEEN_MINUTES_AGO);
    expect(deleting?.query).toContain('delete from "rate_limits"');
  });

  test("clears the client's wrong codes", async () => {
    const neonHttp = answering(NO_ROWS);

    await clearWrongInviteCodes(CLIENT);

    expect(neonHttp.queries[0]?.query).toContain('delete from "rate_limits"');
    expect(neonHttp.queries[0]?.params).toEqual([
      `wrong-invite-code:${CLIENT}`,
    ]);
  });
});
