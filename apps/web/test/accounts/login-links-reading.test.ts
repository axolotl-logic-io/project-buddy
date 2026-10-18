// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  LOGIN_LINK_LIFETIME_MINUTES,
  readLoginLinkUser,
} from "@/accounts/login-links.ts";
import {
  LINK_PAGE_COPY,
  LOGIN_COPY,
  LOGIN_EMAIL_COPY,
} from "@/ui/copy/login.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
} from "../db/fake-neon-http.ts";
import { userIdFixture } from "../id-fixtures.ts";

const NOW = new Date("2026-10-12T12:00:00.000Z");
const USER_ID = userIdFixture("5b1f0c3e-8a2d-4c6b-9e7f-0a1b2c3d4e5f");
// A token of the form the site makes: 43 base64url characters.
const WELL_FORMED_TOKEN = "Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3";
// A SHA-256 in hexadecimal, as login_links stores a token's.
const SHA_256_HEX = /^[0-9a-f]{64}$/u;
const NO_ROWS: NeonHttpAnswer = { kind: "rows", columns: [], rows: [] };
const MALFORMED_TOKENS: readonly string[] = [
  "",
  "short",
  `${WELL_FORMED_TOKEN}a`,
  `${WELL_FORMED_TOKEN.slice(1)}=`,
];

function database(answer: NeonHttpAnswer): FakeNeonHttp {
  const neonHttp = fakeNeonHttp(answer);
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("readLoginLinkUser", () => {
  test("reads the unexpired link's user, with her hidden extras, by the token's hash", async () => {
    const neonHttp = database({
      kind: "rows",
      columns: [
        { name: "id", type: "text" },
        { name: "session_epoch", type: "int4" },
        { name: "hidden_extras", type: "_text" },
      ],
      rows: [[USER_ID, "2", "{tool-lines,working-notes}"]],
    });

    expect(await readLoginLinkUser(WELL_FORMED_TOKEN, NOW)).toEqual({
      user: { id: USER_ID, sessionEpoch: 2 },
      hiddenExtras: ["tool-lines", "working-notes"],
    });
    expect(neonHttp.queries).toHaveLength(1);
    expect(neonHttp.queries[0]?.query).toContain('"users"."hidden_extras"');
    expect(neonHttp.queries[0]?.query).toContain(
      '"login_links"."expires_at" > $2',
    );
    expect(neonHttp.queries[0]?.params).toEqual([
      expect.stringMatching(SHA_256_HEX),
      NOW.toISOString(),
    ]);
  });

  test("is undefined for a link that has expired or never existed", async () => {
    database(NO_ROWS);

    expect(await readLoginLinkUser(WELL_FORMED_TOKEN, NOW)).toBeUndefined();
  });

  test("reads nothing for a token of the wrong form", async () => {
    const neonHttp = database(NO_ROWS);

    const users = await Promise.all(
      MALFORMED_TOKENS.map((token) => readLoginLinkUser(token, NOW)),
    );

    expect(users).toEqual(MALFORMED_TOKENS.map(() => undefined));
    expect(neonHttp.queries).toEqual([]);
  });
});

describe("the link's lifetime", () => {
  test("is the one the pages and the email name", () => {
    const lifetime = `${LOGIN_LINK_LIFETIME_MINUTES} minutes`;

    expect(LOGIN_COPY.checkEmail).toContain(lifetime);
    expect(LINK_PAGE_COPY.expired).toContain(lifetime);
    expect(LOGIN_EMAIL_COPY.expiry).toContain(lifetime);
  });
});
