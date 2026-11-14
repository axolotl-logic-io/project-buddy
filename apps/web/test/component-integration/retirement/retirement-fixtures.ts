import type {
  RetiredDefinition,
  RetiredDetail,
} from "@/retirement/retirement-store.ts";
import { userConstructIdFixture } from "../../support/id-fixtures.ts";

const RETIRED_CONSTRUCT: RetiredDetail = {
  id: userConstructIdFixture("2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"),
  kind: "construct",
  name: "Moss",
  retiredAt: new Date("2026-11-05T10:00:00Z"),
  texts: [
    {
      name: "visualDescription",
      text: "A moss-covered clockwork guide.",
    },
  ],
};
const RETIRED_DEFINITIONS: readonly RetiredDefinition[] = [RETIRED_CONSTRUCT];

export { RETIRED_CONSTRUCT, RETIRED_DEFINITIONS };
