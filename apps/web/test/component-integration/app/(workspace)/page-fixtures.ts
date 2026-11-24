// Stored quests for the page tests, shaped as the quest store returns
// them, with fixed canonical UUID ids from the id fixtures.

import type { Quest } from "@/quests/store.ts";
import { questIdFixture } from "../../../support/id-fixtures.ts";

const FOX_QUEST: Quest = {
  id: questIdFixture("6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b"),
  name: "Low-poly fox",
  createdAt: new Date("2026-10-09T12:00:00Z"),
  status: "active",
  statusRevision: 0,
  constructId: "lumen",
  sharing: { kind: "personal" },
};

export { FOX_QUEST };
