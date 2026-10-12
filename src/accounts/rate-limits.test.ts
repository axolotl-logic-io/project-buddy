// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  countLoginLinkRequest,
  LOGIN_LINK_LIMITS,
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
const ADDRESS = "mabel@example.test";
const CLIENT = "203.0.113.7";
const ADDRESS_REQUESTS: number = LOGIN_LINK_LIMITS.address.requests;
const CLIENT_REQUESTS: number = LOGIN_LINK_LIMITS.client.requests;

function counted(count: number): NeonHttpAnswer {
  return {
    kind: "rows",
    columns: [{ name: "count", type: "int4" }],
    rows: [[String(count)]],
  };
}

// The database counts the address's request as addressCount and the
// client's as clientCount.
function countsOf(addressCount: number, clientCount: number): FakeNeonHttp {
  const neonHttp = fakeNeonHttp(counted(addressCount), counted(clientCount));
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

describe("countLoginLinkRequest counting", () => {
  test("counts the address and the client in one batch of upserts", async () => {
    const neonHttp = countsOf(1, 1);

    await countLoginLinkRequest(ADDRESS, CLIENT, NOW);

    expect(neonHttp.batches).toHaveLength(1);
    const [forAddress, forClient] = neonHttp.batches[0] ?? [];
    expect(forAddress?.query).toContain('insert into "rate_limits"');
    expect(forAddress?.query).toContain('on conflict ("key") do update');
    expect(forAddress?.query).toContain('returning "count"');
    expect(forAddress?.params).toContain(`address:${ADDRESS}`);
    expect(forClient?.params).toContain(`client:${CLIENT}`);
  });

  test("starts a new window once the key's window has passed", async () => {
    const neonHttp = countsOf(1, 1);

    await countLoginLinkRequest(ADDRESS, CLIENT, NOW);

    const [forAddress, forClient] = neonHttp.batches[0] ?? [];
    expect(forAddress?.query).toContain(
      'case when "rate_limits"."window_started_at" <=',
    );
    expect(forAddress?.params).toContain("2026-10-12T11:45:00.000Z");
    expect(forClient?.params).toContain("2026-10-12T11:00:00.000Z");
    expect(forAddress?.params).toContain(NOW.toISOString());
  });
});

describe("countLoginLinkRequest answering", () => {
  test("allows requests up to both limits", async () => {
    countsOf(ADDRESS_REQUESTS, CLIENT_REQUESTS);

    expect(await countLoginLinkRequest(ADDRESS, CLIENT, NOW)).toBe(true);
  });

  test("refuses a request past the address's limit", async () => {
    countsOf(ADDRESS_REQUESTS + 1, 1);

    expect(await countLoginLinkRequest(ADDRESS, CLIENT, NOW)).toBe(false);
  });

  test("refuses a request past the client's limit", async () => {
    countsOf(1, CLIENT_REQUESTS + 1);

    expect(await countLoginLinkRequest(ADDRESS, CLIENT, NOW)).toBe(false);
  });

  test("throws the storage case when the database is unreachable", async () => {
    spyOnErrorLog();
    vi.stubGlobal("fetch", fakeNeonHttp({ kind: "unreachable" }).fetch);

    await expect(
      countLoginLinkRequest(ADDRESS, CLIENT, NOW),
    ).rejects.toBeInstanceOf(AppError);
  });
});
