import { defaultSpellDefinition } from "@/spells/spell-definition.ts";
// Stored data for the phone checks (phone-pages-test-kit.tsx), shaped as the
// stores return it: what each page shows beyond page-fixtures.ts's quests
// and chats.

import type { SessionUser } from "@/auth/session-token.ts";
import { OWN_PROMPT_ID } from "@/ids.ts";
import type { OwnSpell } from "@/spells/own-spell-store.ts";
import { userIdFixture } from "../../support/id-fixtures.ts";

// The user a sign-in link that works signs in: a signed-up account, so
// continuing needs no name.
const LINK_USER: SessionUser & { readonly needsName: boolean } = {
  id: userIdFixture("5b1f0c3e-8a2d-4c6b-9e7f-0a1b2c3d4e5f"),
  sessionEpoch: 0,
  needsName: false,
};

const OWN_SPELL: OwnSpell = {
  id: OWN_PROMPT_ID.parse("e17f52de-1234-4123-8123-123456789abc"),
  name: "Small experiments",
  definition: defaultSpellDefinition("brainstorm"),
  createdAt: new Date("2026-11-01T00:00:00Z"),
  updatedAt: new Date("2026-11-01T00:00:00Z"),
};

export { LINK_USER, OWN_SPELL };
