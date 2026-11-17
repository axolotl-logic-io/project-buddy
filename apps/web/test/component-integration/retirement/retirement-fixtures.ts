import type {
  RetiredDefinition,
  RetiredDetail,
} from "@/retirement/retirement-store.ts";
import { userConstructIdFixture } from "../../support/id-fixtures.ts";

const RETIRED_SPELL: RetiredDetail = {
  id: userConstructIdFixture("2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"),
  kind: "spell",
  name: "Moss",
  retiredAt: new Date("2026-11-05T10:00:00Z"),
  texts: [
    {
      name: "destination",
      text: "Ideas",
    },
  ],
};
const RETIRED_DEFINITIONS: readonly RetiredDefinition[] = [RETIRED_SPELL];

export { RETIRED_DEFINITIONS, RETIRED_SPELL };
