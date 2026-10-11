import { sql } from "drizzle-orm";
import { afterEach, describe, expect, test, vi } from "vitest";
import { FAKE_DATABASE_URL, fakeNeonHttp } from "@/db/fake-neon-http.ts";

const NOT_SET = /DATABASE_URL is not set/u;
const LOCAL_DATABASE_URL = FAKE_DATABASE_URL.replace(
  "db.example",
  "localhost:4444",
);

// Runs one query through getDb with DATABASE_URL set to databaseUrl, and
// returns the URL the driver sent it to.
async function endpointQueriedFor(databaseUrl: string): Promise<string> {
  vi.stubEnv("DATABASE_URL", databaseUrl);
  const neonHttp = fakeNeonHttp({ kind: "rows", columns: [], rows: [] });
  const endpoints: string[] = [];
  vi.stubGlobal(
    "fetch",
    (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      endpoints.push(new Request(input).url);
      return neonHttp.fetch(input, init);
    },
  );
  const { getDb } = await import("@/db/client.ts");

  await getDb().execute(sql`select 1`);

  const [endpoint = ""] = endpoints;
  return endpoint;
}

describe("getDb", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test("throws when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getDb } = await import("@/db/client.ts");

    expect(() => getDb()).toThrow(NOT_SET);
  });

  test("returns the same client on every call", async () => {
    vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
    const { getDb } = await import("@/db/client.ts");

    expect(getDb()).toBe(getDb());
  });

  test("sends queries for a database on localhost to the local proxy at the URL's host and port", async () => {
    await expect(endpointQueriedFor(LOCAL_DATABASE_URL)).resolves.toBe(
      "http://localhost:4444/sql",
    );
  });

  test("still sends queries for a Neon database to Neon over HTTPS after a local one", async () => {
    await endpointQueriedFor(LOCAL_DATABASE_URL);
    vi.resetModules();

    await expect(endpointQueriedFor(FAKE_DATABASE_URL)).resolves.toBe(
      "https://api.example/sql",
    );
  });
});
