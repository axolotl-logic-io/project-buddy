// use_case_too_many_sign_in_requests's limits, counted by the test
// database: per address and client, per address across every client, and
// per client across every address, each with its own window. The e2e test
// walks the first limit through the sign-in page; this one walks them all.
// Each test asks for its own addresses from its own clients, so it counts
// from zero, and counts at the real time plus the wait it needs, so no
// other test's request deletes its rows as expired.
import { like } from "drizzle-orm";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  countLoginLinkRequest,
  endRateLimitWindowsFor,
} from "@/accounts/rate-limits.ts";
import { getDb } from "@/db/client.ts";
import { rateLimits } from "@/db/tables/rate-limits.ts";
import { readSessionSecret } from "@/env.ts";

// The limits in use-cases/accounts.md, and their windows.
const PER_ADDRESS_AND_CLIENT = 3;
const PER_CLIENT = 20;
const MS_PER_MINUTE = 60_000;
const ADDRESS_WINDOW_MINUTES = 15;
const CLIENT_WINDOW_MINUTES = 60;
// Clients that each fill their limit for one address: nine of the ten the
// address allows.
const FULL_CLIENTS = 3;

function newAddress(): string {
  return `rate-${crypto.randomUUID()}@example.test`;
}

function newClient(): string {
  return `client-${crypto.randomUUID()}`;
}

// The answers to count requests for the address from the client, one after
// another, at now.
async function askTimes(
  address: string,
  client: string,
  count: number,
  now: Date,
): Promise<boolean[]> {
  if (count === 0) {
    return [];
  }
  const answer = await countLoginLinkRequest(address, client, now);
  return [answer, ...(await askTimes(address, client, count - 1, now))];
}

// The answers to asking for the address from the client up to their limit,
// and once more.
const FILLED: readonly boolean[] = [
  ...Array.from({ length: PER_ADDRESS_AND_CLIENT }, () => true),
  false,
];

// Asks for the address from the client up to their limit, and once more,
// answering the answers, which are FILLED.
function fillPair(
  address: string,
  client: string,
  now: Date,
): Promise<boolean[]> {
  return askTimes(address, client, PER_ADDRESS_AND_CLIENT + 1, now);
}

function minutesLater(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * MS_PER_MINUTE);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("use_case_too_many_sign_in_requests", () => {
  test("allows three requests for an address from one client, then refuses", async () => {
    const now = new Date();
    const address = newAddress();
    const client = newClient();

    expect(await fillPair(address, client, now)).toEqual(FILLED);
    expect(await countLoginLinkRequest(address, newClient(), now)).toBe(true);
    expect(await countLoginLinkRequest(newAddress(), client, now)).toBe(true);
  });

  test("allows ten requests for an address from every client, not counting refused ones", async () => {
    const now = new Date();
    const address = newAddress();
    // Three clients' worth, each with one refused request, which doesn't
    // count against the address.
    const clients = Array.from({ length: FULL_CLIENTS }, newClient);
    expect(
      await Promise.all(
        clients.map((client) => fillPair(address, client, now)),
      ),
    ).toEqual(clients.map(() => FILLED));
    const last = newClient();

    expect(await countLoginLinkRequest(address, last, now)).toBe(true);
    expect(await countLoginLinkRequest(address, last, now)).toBe(false);
    expect(await countLoginLinkRequest(address, newClient(), now)).toBe(false);
  });

  test("allows twenty requests from one client, whatever the addresses", async () => {
    const now = new Date();
    const client = newClient();
    const addresses = Array.from({ length: PER_CLIENT }, newAddress);

    expect(
      await Promise.all(
        addresses.map((address) => countLoginLinkRequest(address, client, now)),
      ),
    ).toEqual(addresses.map(() => true));
    expect(await countLoginLinkRequest(newAddress(), client, now)).toBe(false);
    expect(await countLoginLinkRequest(newAddress(), newClient(), now)).toBe(
      true,
    );
  });
});

describe("use_case_too_many_sign_in_requests windows and addresses", () => {
  test("allows a request again once its limit's window has passed", async () => {
    const now = new Date();
    const address = newAddress();
    const client = newClient();
    expect(await fillPair(address, client, now)).toEqual(FILLED);
    const busyClient = newClient();
    await Promise.all(
      Array.from({ length: PER_CLIENT }, () =>
        countLoginLinkRequest(newAddress(), busyClient, now),
      ),
    );
    const afterAddressWait = minutesLater(now, ADDRESS_WINDOW_MINUTES);

    expect(await countLoginLinkRequest(address, client, afterAddressWait)).toBe(
      true,
    );
    expect(
      await countLoginLinkRequest(newAddress(), busyClient, afterAddressWait),
    ).toBe(false);
    expect(
      await countLoginLinkRequest(
        newAddress(),
        busyClient,
        minutesLater(now, CLIENT_WINDOW_MINUTES),
      ),
    ).toBe(true);
  });

  test("counts an address however it is typed", async () => {
    const now = new Date();
    const address = newAddress();
    const client = newClient();
    await askTimes(address, client, PER_ADDRESS_AND_CLIENT, now);

    expect(
      await countLoginLinkRequest(` ${address.toUpperCase()} `, client, now),
    ).toBe(false);
  });

  test("keeps no address in the table, only its HMAC keyed by SESSION_SECRET", async () => {
    const now = new Date();
    const address = newAddress();
    const client = newClient();
    await askTimes(address, client, PER_ADDRESS_AND_CLIENT, now);

    const naming = await getDb()
      .select({ key: rateLimits.key })
      .from(rateLimits)
      .where(like(rateLimits.key, `%${address}%`));
    expect(naming).toEqual([]);
    vi.stubEnv("SESSION_SECRET", `${readSessionSecret()}-another`);
    expect(await countLoginLinkRequest(address, client, now)).toBe(true);
  });
});

describe("endRateLimitWindowsFor", () => {
  test("with an address, ends the address's windows from every client, and no other address's", async () => {
    const now = new Date();
    const [hers, other] = [newAddress(), newAddress()];
    const client = newClient();
    expect(await fillPair(hers, client, now)).toEqual(FILLED);
    expect(await fillPair(other, client, now)).toEqual(FILLED);

    await endRateLimitWindowsFor({ address: hers });

    expect(await countLoginLinkRequest(hers, client, now)).toBe(true);
    expect(await countLoginLinkRequest(other, client, now)).toBe(false);
  });

  test("with a client, ends the client's windows for every address, and no other client's", async () => {
    const now = new Date();
    const address = newAddress();
    const [hers, other] = [newClient(), newClient()];
    expect(await fillPair(address, hers, now)).toEqual(FILLED);
    expect(await fillPair(address, other, now)).toEqual(FILLED);

    await endRateLimitWindowsFor({ clientKey: hers });

    expect(await countLoginLinkRequest(address, hers, now)).toBe(true);
    expect(await countLoginLinkRequest(address, other, now)).toBe(false);
  });

  test("with both, ends only that address and client's window", async () => {
    const now = new Date();
    const [hers, other] = [newAddress(), newAddress()];
    const [herClient, otherClient] = [newClient(), newClient()];
    expect(await fillPair(hers, herClient, now)).toEqual(FILLED);
    expect(await fillPair(hers, otherClient, now)).toEqual(FILLED);
    expect(await fillPair(other, herClient, now)).toEqual(FILLED);

    await endRateLimitWindowsFor({ address: hers, clientKey: herClient });

    expect(await countLoginLinkRequest(hers, herClient, now)).toBe(true);
    expect(await countLoginLinkRequest(hers, otherClient, now)).toBe(false);
    expect(await countLoginLinkRequest(other, herClient, now)).toBe(false);
  });
});
