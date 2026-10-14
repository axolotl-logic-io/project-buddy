// @vitest-environment node
// A chat's persona is the snapshot saved with it: editing the persona later
// changes no chat, and a chat saved before snapshots reads as its built-in
// persona.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { NewMessage } from "@/chats/chat-rows.ts";
import { createChatWithOpening } from "@/chats/new-chat-store.ts";
import { getChat } from "@/chats/store.ts";
import { CHAT_COLUMNS, storedRows } from "@/chats/stored-rows.ts";
import { FAKE_DATABASE_URL, type FakeNeonHttp } from "@/db/fake-neon-http.ts";
import {
  chatIdFixture,
  messageIdFixture,
  projectIdFixture,
  userIdFixture,
  userPersonaIdFixture,
} from "@/id-fixtures.ts";
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  type PersonaParts,
  type PersonaSnapshot,
  snapshotOf,
} from "@/personas/index.ts";
import { updatePersona } from "@/personas/persona-store.ts";
import { storedPersonas } from "@/personas/stored-personas.ts";

const OWNER = userIdFixture();
const CHAT_ID = chatIdFixture();
const PROJECT_ID = projectIdFixture();
const PERSONA_ID = userPersonaIdFixture();
const CREATED_AT = "2026-10-11 09:00:00+00";
const OPENING: NewMessage = {
  id: messageIdFixture("opening"),
  role: "assistant",
  parts: [{ type: "text", text: "What are we making?" }],
};
// The user's own persona as the chat started with it, and as edited later.
const OWN_PERSONA: PersonaSnapshot = {
  name: "Professor Bevel",
  parts: { ...getPersona("mr-tee").parts, voice: "## Voice\n\nPrecise." },
};
const EDITED_PARTS: PersonaParts = {
  ...OWN_PERSONA.parts,
  voice: "## Voice\n\nLoud.",
};
const READS_PERSONAS = /"personas"/u;
const UPDATES_PERSONA = /^update "personas" set /u;

// Chats joined with their project's name, as getChat reads them: one with
// these persona columns.
function storedChat(
  personaId: string,
  personaName: string | null,
  personaParts: string | null,
): FakeNeonHttp {
  return storedRows(
    [...CHAT_COLUMNS, "project_name"],
    [
      [
        CHAT_ID,
        PROJECT_ID,
        personaId,
        personaName,
        personaParts,
        null,
        "f",
        CREATED_AT,
        "Fox",
      ],
    ],
  );
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("a chat's persona snapshot", () => {
  test("a chat keeps its snapshot after the user persona it came from is edited", async () => {
    const started = storedChat(DEFAULT_PERSONA_ID, null, null);
    await createChatWithOpening(
      OWNER,
      {
        projectId: PROJECT_ID,
        persona: { id: DEFAULT_PERSONA_ID, ...OWN_PERSONA },
      },
      OPENING,
    );
    expect(started.batches[0]?.[0]?.params).toEqual(
      expect.arrayContaining([
        OWN_PERSONA.name,
        JSON.stringify(OWN_PERSONA.parts),
      ]),
    );

    const edit = storedPersonas([]);
    await updatePersona(OWNER, PERSONA_ID, { parts: EDITED_PARTS });
    expect(edit.queries.map(({ query }) => query)).toEqual([
      expect.stringMatching(UPDATES_PERSONA),
    ]);

    const read = storedChat(
      DEFAULT_PERSONA_ID,
      OWN_PERSONA.name,
      JSON.stringify(OWN_PERSONA.parts),
    );
    expect(await getChat(OWNER, CHAT_ID)).toHaveProperty(
      "persona",
      OWN_PERSONA,
    );
    expect(read.queries[0]?.query).not.toMatch(READS_PERSONAS);
  });
});

describe("a chat's persona read", () => {
  test("a chat saved before snapshots reads as its built-in persona", async () => {
    storedChat("mr-tee", null, null);

    expect(await getChat(OWNER, CHAT_ID)).toHaveProperty(
      "persona",
      snapshotOf(getPersona("mr-tee")),
    );
  });

  test("a chat saved before snapshots, in a retired persona, reads as the default persona", async () => {
    storedChat("retired-persona", null, null);

    expect(await getChat(OWNER, CHAT_ID)).toHaveProperty(
      "persona",
      snapshotOf(getPersona(DEFAULT_PERSONA_ID)),
    );
  });

  test("a snapshot missing a part reads as the chat's built-in persona", async () => {
    const { voice: _voice, ...withoutVoice } = OWN_PERSONA.parts;
    storedChat("mr-tee", OWN_PERSONA.name, JSON.stringify(withoutVoice));

    expect(await getChat(OWNER, CHAT_ID)).toHaveProperty(
      "persona",
      snapshotOf(getPersona("mr-tee")),
    );
  });
});
