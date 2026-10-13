// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { personaOwnedBy } from "@/accounts/owner-scope.ts";
import { holdsPredicate } from "@/accounts/owner-scope-test-kit.ts";
import { FAKE_DATABASE_URL, fakeNeonHttp } from "@/db/fake-neon-http.ts";
import { AppError } from "@/errors/app-error.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { userIdFixture, userPersonaIdFixture } from "@/id-fixtures.ts";
import { getPersona, type PersonaSnapshot } from "@/personas/index.ts";
import {
  clonePersona,
  deletePersona,
  getUserPersona,
  listPersonas,
  type UserPersona,
  updatePersona,
} from "@/personas/persona-store.ts";
import {
  type StoredPersona,
  storedPersonas,
} from "@/personas/stored-personas.ts";

const OWNER = userIdFixture();
const PERSONA_ID = userPersonaIdFixture();
const CREATED_AT = "2026-10-12 09:00:00+00";
const UPDATED_AT = "2026-10-13 09:00:00+00";
const MR_TEE = getPersona("mr-tee");
const OWN_PERSONA: PersonaSnapshot = {
  name: "Mr. Tee (copy)",
  parts: { ...MR_TEE.parts, voice: "## Voice\n\nCalm." },
};
const STORED: StoredPersona = {
  id: PERSONA_ID,
  userId: OWNER,
  persona: OWN_PERSONA,
  clonedFrom: "mr-tee",
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
};
const READ: UserPersona = {
  id: PERSONA_ID,
  ...OWN_PERSONA,
  clonedFrom: "mr-tee",
  createdAt: new Date(CREATED_AT),
  updatedAt: new Date(UPDATED_AT),
};
const INSERTS_PERSONA = /^insert into "personas"/u;
const UPDATES_PERSONA = /^update "personas" set /u;

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("persona store reads", () => {
  test("listPersonas reads the owner's personas", async () => {
    const neonHttp = storedPersonas([STORED]);

    expect(await listPersonas(OWNER)).toEqual([READ]);
    expect(holdsPredicate(neonHttp.queries[0], personaOwnedBy(OWNER))).toBe(
      true,
    );
  });

  test("listPersonas skips a persona whose stored parts are not every part", async () => {
    const { voice: _voice, ...withoutVoice } = OWN_PERSONA.parts;
    storedPersonas([{ ...STORED, storedParts: withoutVoice }]);

    expect(await listPersonas(OWNER)).toEqual([]);
  });

  test("getUserPersona looks up the lowercase id among the owner's personas", async () => {
    const neonHttp = storedPersonas([STORED]);

    expect(await getUserPersona(OWNER, PERSONA_ID.toUpperCase())).toEqual(READ);
    expect(neonHttp.queries[0]?.params).toEqual([PERSONA_ID, OWNER]);
  });

  test("getUserPersona finds a malformed id nowhere, without a query", async () => {
    const neonHttp = storedPersonas([STORED]);

    expect(await getUserPersona(OWNER, "mr-tee")).toBeUndefined();
    expect(neonHttp.queries).toHaveLength(0);
  });
});

describe("persona store clonePersona", () => {
  test("saves a copy of a built-in persona as the owner's", async () => {
    const neonHttp = storedPersonas([STORED]);

    expect(await clonePersona(OWNER, "mr-tee")).toEqual(READ);

    const [insert] = neonHttp.queries;
    expect(insert?.query).toMatch(INSERTS_PERSONA);
    expect(insert?.params).toEqual([
      OWNER,
      `${MR_TEE.name} (copy)`,
      JSON.stringify(MR_TEE.parts),
      "mr-tee",
    ]);
  });

  test("saves a copy of one of the owner's own personas, read as the owner's", async () => {
    const neonHttp = storedPersonas([STORED]);

    await clonePersona(OWNER, PERSONA_ID);

    const [read, insert] = neonHttp.queries;
    expect(holdsPredicate(read, personaOwnedBy(OWNER))).toBe(true);
    expect(insert?.params).toEqual([
      OWNER,
      `${OWN_PERSONA.name} (copy)`,
      JSON.stringify(OWN_PERSONA.parts),
      PERSONA_ID,
    ]);
  });

  test("saves nothing for an id that is no persona", async () => {
    const neonHttp = storedPersonas([]);

    expect(await clonePersona(OWNER, "retired-persona")).toBeUndefined();
    expect(neonHttp.queries).toHaveLength(0);
  });
});

describe("persona store edits", () => {
  test("updatePersona saves the new parts and the time, in the owner's persona", async () => {
    const neonHttp = storedPersonas([STORED]);
    const { parts } = getPersona("hippy");

    expect(await updatePersona(OWNER, PERSONA_ID, { parts })).toEqual(READ);

    const [update] = neonHttp.queries;
    expect(update?.query).toMatch(UPDATES_PERSONA);
    expect(update?.query).toContain(`"updated_at" = now()`);
    expect(update?.query).not.toContain(`"name" =`);
    expect(update?.params).toEqual([JSON.stringify(parts), PERSONA_ID, OWNER]);
  });

  test("updatePersona saves a new name alone", async () => {
    const neonHttp = storedPersonas([STORED]);

    await updatePersona(OWNER, PERSONA_ID, { name: "Mr. Calm" });

    expect(neonHttp.queries[0]?.params).toEqual([
      "Mr. Calm",
      PERSONA_ID,
      OWNER,
    ]);
  });

  test("deletePersona deletes the owner's persona", async () => {
    const neonHttp = storedPersonas([STORED]);

    expect(await deletePersona(OWNER, PERSONA_ID)).toBe(true);
    expect(holdsPredicate(neonHttp.queries[0], personaOwnedBy(OWNER))).toBe(
      true,
    );
  });

  test("rejects with a logged AppError when the database is unreachable", async () => {
    vi.stubGlobal("fetch", fakeNeonHttp({ kind: "unreachable" }).fetch);
    const log = spyOnErrorLog();

    const error = await listPersonas(OWNER).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(log).toHaveBeenCalledWith(
      "[app-error] database-unreachable in listPersonas",
      expect.any(String),
    );
  });
});
