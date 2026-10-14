// @vitest-environment node
// Two users: user B cannot list, read, clone, update or delete user A's
// persona. The database holds only A's persona and answers B's queries as
// Postgres would: each is scoped to B's personas, so it finds nothing.
import type { SQL } from "drizzle-orm";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { personaOwnedBy } from "@/accounts/owner-scope.ts";
import { holdsPredicate } from "@/accounts/owner-scope-test-kit.ts";
import { FAKE_DATABASE_URL } from "@/db/fake-neon-http.ts";
import { userIdFixture, userPersonaIdFixture } from "@/id-fixtures.ts";
import { getPersona } from "@/personas/index.ts";
import {
  clonePersona,
  deletePersona,
  getUserPersona,
  listPersonas,
  updatePersona,
} from "@/personas/persona-store.ts";
import {
  type StoredPersona,
  storedPersonas,
} from "@/personas/stored-personas.ts";

const USER_A = userIdFixture();
const USER_B = userIdFixture();
const A_PERSONA_ID = userPersonaIdFixture();
const A_PERSONA: StoredPersona = {
  id: A_PERSONA_ID,
  userId: USER_A,
  persona: { name: "A's tutor", parts: getPersona("hippy").parts },
  createdAt: "2026-10-12 09:00:00+00",
  updatedAt: "2026-10-12 09:00:00+00",
};

// The database as user B's queries find it: none of A's rows.
let queriesOfB = storedPersonas([]);

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  queriesOfB = storedPersonas([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("user A reads her own persona through the same query", async () => {
  const neonHttp = storedPersonas([A_PERSONA]);

  expect(await getUserPersona(USER_A, A_PERSONA_ID)).toHaveProperty(
    "id",
    A_PERSONA_ID,
  );
  expect(holdsPredicate(neonHttp.queries[0], personaOwnedBy(USER_A))).toBe(
    true,
  );
});

// Each persona store function, called by B on A's persona, with what B gets:
// the same as for a persona that does not exist.
const callsOfB: [string, () => Promise<unknown>, unknown][] = [
  ["listPersonas", (): Promise<unknown> => listPersonas(USER_B), []],
  [
    "getUserPersona",
    (): Promise<unknown> => getUserPersona(USER_B, A_PERSONA_ID),
    undefined,
  ],
  [
    "clonePersona",
    (): Promise<unknown> => clonePersona(USER_B, A_PERSONA_ID),
    undefined,
  ],
  [
    "updatePersona",
    (): Promise<unknown> =>
      updatePersona(USER_B, A_PERSONA_ID, { name: "Taken over" }),
    undefined,
  ],
  [
    "deletePersona",
    (): Promise<unknown> => deletePersona(USER_B, A_PERSONA_ID),
    false,
  ],
];

test.each(callsOfB)(
  "%s by user B finds user A's persona nowhere",
  async (_name, call, notFound) => {
    expect(await call()).toEqual(notFound);

    expect(queriesOfB.queries).toHaveLength(1);
    const [query] = queriesOfB.queries;
    const scopedToB: SQL = personaOwnedBy(USER_B);
    expect(holdsPredicate(query, scopedToB)).toBe(true);
    expect(query?.params).not.toContain(USER_A);
  },
);
