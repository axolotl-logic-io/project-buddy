// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  countLoginLinkRequest,
  endRateLimitWindowsFor,
} from "@/accounts/rate-limits.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
  type NeonHttpQuery,
} from "@/db/fake-neon-http.ts";
import { AppError } from "@/errors/app-error.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";

const NOW = new Date("2026-10-12T12:00:00.000Z");
const FIFTEEN_MINUTES_AGO = "2026-10-12T11:45:00.000Z";
const HOUR_AGO = "2026-10-12T11:00:00.000Z";
const ADDRESS = "mabel@example.test";
const CLIENT = "203.0.113.7";
const SESSION_SECRET = "test-session-secret-at-least-32-characters";
// The limits in use-cases/accounts.md.
const PER_ADDRESS_AND_CLIENT = 3;
const PER_ADDRESS = 10;
const PER_CLIENT = 20;
const ADDRESS_HMAC = /^[0-9a-f]{64}$/u;
const ADDRESS_HMAC_LENGTH = 64;

const NO_ROWS: NeonHttpAnswer = { kind: "rows", columns: [], rows: [] };

function counted(count: number): NeonHttpAnswer {
  return {
    kind: "rows",
    columns: [{ name: "count", type: "int4" }],
    rows: [[String(count)]],
  };
}

// The database counts the request as these counts, in the batch's order:
// the address and client together, the client, then the address.
function countsOf(pair: number, client: number, address: number): FakeNeonHttp {
  const neonHttp = fakeNeonHttp(
    counted(pair),
    counted(client),
    counted(address),
    NO_ROWS,
  );
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

function answering(...answers: readonly NeonHttpAnswer[]): FakeNeonHttp {
  const [first = NO_ROWS, ...later] = answers;
  const neonHttp = fakeNeonHttp(first, ...later);
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

// The key a query's parameters name, which starts with prefix.
function keyIn(query: NeonHttpQuery | undefined, prefix: string): string {
  const key = query?.params.find(
    (param): param is string =>
      typeof param === "string" && param.startsWith(prefix),
  );
  if (key === undefined) {
    throw new Error(`No ${prefix} key in the query`);
  }
  return key;
}

// The address's HMAC, as the batch's address key names it.
async function addressKeyOf(address: string): Promise<string> {
  const neonHttp = countsOf(1, 1, 1);
  await countLoginLinkRequest(address, CLIENT, NOW);
  return keyIn(neonHttp.batches[0]?.[2], "address:");
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  vi.stubEnv("SESSION_SECRET", SESSION_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("countLoginLinkRequest keys", () => {
  test("counts the address and client, the client, and the address in one batch of upserts", async () => {
    const neonHttp = countsOf(1, 1, 1);

    await countLoginLinkRequest(ADDRESS, CLIENT, NOW);

    expect(neonHttp.batches).toHaveLength(1);
    const [forPair, forClient, forAddress] = neonHttp.batches[0] ?? [];
    for (const upsert of [forPair, forClient, forAddress]) {
      expect(upsert?.query).toContain('insert into "rate_limits"');
      expect(upsert?.query).toContain('on conflict ("key") do update');
      expect(upsert?.query).toContain('returning "count"');
    }
    expect(forClient?.params).toContain(`client:${CLIENT}`);
    const [, hmac] = keyIn(forAddress, "address:").split(":");
    expect(hmac).toMatch(ADDRESS_HMAC);
    expect(forPair?.params).toContain(`address-client:${hmac}:${CLIENT}`);
  });

  test("names the address only by its HMAC, the same however it is typed", async () => {
    const neonHttp = countsOf(1, 1, 1);

    await countLoginLinkRequest(ADDRESS, CLIENT, NOW);

    const params = neonHttp.batches[0]?.flatMap((query) => query.params) ?? [];
    expect(JSON.stringify(params)).not.toContain(ADDRESS);
    expect(await addressKeyOf(" Mabel@Example.TEST ")).toBe(
      await addressKeyOf(ADDRESS),
    );
    expect(await addressKeyOf("dipper@example.test")).not.toBe(
      await addressKeyOf(ADDRESS),
    );
  });

  test("keys the address's HMAC by SESSION_SECRET", async () => {
    const withOneSecret = await addressKeyOf(ADDRESS);
    vi.stubEnv("SESSION_SECRET", `${SESSION_SECRET}-another`);

    expect(await addressKeyOf(ADDRESS)).not.toBe(withOneSecret);
  });
});

describe("countLoginLinkRequest counting", () => {
  test("counts against the address only a request within the address-and-client and client limits", async () => {
    const neonHttp = countsOf(1, 1, 1);

    await countLoginLinkRequest(ADDRESS, CLIENT, NOW);

    const forAddress = neonHttp.batches[0]?.[2];
    expect(forAddress?.query).toContain(
      'exists (select 1 from "rate_limits" "counted" where "counted"."key" =',
    );
    expect(forAddress?.params).toContain(String(PER_ADDRESS_AND_CLIENT));
    expect(forAddress?.params).toContain(String(PER_CLIENT));
  });

  test("starts a new window once each key's window has passed", async () => {
    const neonHttp = countsOf(1, 1, 1);

    await countLoginLinkRequest(ADDRESS, CLIENT, NOW);

    const [forPair, forClient, forAddress] = neonHttp.batches[0] ?? [];
    expect(forPair?.query).toContain(
      'case when "rate_limits"."window_started_at" <=',
    );
    expect(forPair?.params).toContain(FIFTEEN_MINUTES_AGO);
    expect(forClient?.params).toContain(HOUR_AGO);
    expect(forAddress?.params).toContain(FIFTEEN_MINUTES_AGO);
    expect(forPair?.params).toContain(NOW.toISOString());
  });

  test("deletes, last, a bounded number of rows whose windows have passed, waiting on none", async () => {
    const neonHttp = countsOf(1, 1, 1);

    await countLoginLinkRequest(ADDRESS, CLIENT, NOW);

    const deleting = neonHttp.batches[0]?.[3];
    expect(deleting?.query).toContain('delete from "rate_limits"');
    expect(deleting?.query).toContain('"rate_limits"."window_started_at" <=');
    expect(deleting?.query).toContain("limit $2 for update skip locked");
    expect(deleting?.params).toEqual([HOUR_AGO, "100"]);
  });
});

describe("countLoginLinkRequest answering", () => {
  test("allows requests up to every limit", async () => {
    countsOf(PER_ADDRESS_AND_CLIENT, PER_CLIENT, PER_ADDRESS);

    expect(await countLoginLinkRequest(ADDRESS, CLIENT, NOW)).toBe(true);
  });

  test.each([
    [
      "the address and client's",
      PER_ADDRESS_AND_CLIENT + 1,
      1,
      PER_ADDRESS_AND_CLIENT,
    ],
    ["the client's", 1, PER_CLIENT + 1, 1],
    ["the address's", 1, 1, PER_ADDRESS + 1],
  ])(
    "refuses a request past %s limit",
    async (_limit, pair, client, address) => {
      countsOf(pair, client, address);

      expect(await countLoginLinkRequest(ADDRESS, CLIENT, NOW)).toBe(false);
    },
  );

  test("throws the storage case when the database is unreachable", async () => {
    spyOnErrorLog();
    vi.stubGlobal("fetch", fakeNeonHttp({ kind: "unreachable" }).fetch);

    await expect(
      countLoginLinkRequest(ADDRESS, CLIENT, NOW),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("endRateLimitWindowsFor", () => {
  test("deletes the address's own and address-and-client rows", async () => {
    const hmac = (await addressKeyOf(ADDRESS)).slice("address:".length);
    const neonHttp = answering(NO_ROWS);

    await endRateLimitWindowsFor({ address: ADDRESS });

    const [query] = neonHttp.queries;
    expect(query?.query).toContain("starts_with");
    expect(query?.params).toEqual([
      `address:${hmac}`,
      `address-client:${hmac}:`,
    ]);
  });

  test("deletes the client's own, wrong-code and address-and-client rows", async () => {
    const neonHttp = answering(NO_ROWS);

    await endRateLimitWindowsFor({ clientKey: CLIENT });

    const [query] = neonHttp.queries;
    expect(query?.params).toEqual([
      `client:${CLIENT}`,
      `wrong-invite-code:${CLIENT}`,
      "address-client:",
      String("address-client:".length + ADDRESS_HMAC_LENGTH + ":".length + 1),
      CLIENT,
    ]);
  });

  test("with both, deletes only that address and client's row", async () => {
    const hmac = (await addressKeyOf(ADDRESS)).slice("address:".length);
    const neonHttp = answering(NO_ROWS);

    await endRateLimitWindowsFor({ address: ADDRESS, clientKey: CLIENT });

    expect(neonHttp.queries[0]?.params).toEqual([
      `address-client:${hmac}:${CLIENT}`,
    ]);
  });
});
