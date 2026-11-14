// Stored data for the phone checks (phone-pages-test-kit.tsx), shaped as the
// stores return it: what each page shows beyond page-fixtures.ts's quests
// and chats.

import type { SessionUser } from "@/auth/session-token.ts";
import type { OwnConstruct } from "@/constructs/construct-store.ts";
import { getConstruct } from "@/constructs/index.ts";
import {
  userConstructIdFixture,
  userIdFixture,
} from "../../support/id-fixtures.ts";

// Her clone of Vellum.
const VELLUM_CLONE: OwnConstruct = {
  id: userConstructIdFixture("2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"),
  name: `${getConstruct("vellum").name} (clone)`,
  definition: getConstruct("vellum").definition,
  clonedFrom: "vellum",
  createdAt: new Date("2026-10-12T09:00:00Z"),
  updatedAt: new Date("2026-10-12T09:00:00Z"),
};

// The user a sign-in link that works signs in.
const LINK_USER: SessionUser = {
  id: userIdFixture("5b1f0c3e-8a2d-4c6b-9e7f-0a1b2c3d4e5f"),
  sessionEpoch: 0,
};

// Her gold, in micro-USD: 87 gold.
const GOLD_BALANCE = 870_000;

export { GOLD_BALANCE, LINK_USER, VELLUM_CLONE };
