// For browser tests of pages that show experience: a stand-in for
// src/experience/experience-store.ts, which a test file mounts with
//   vi.mock("@/experience/experience-store.ts", () => import("../experience/experience-store-test-kit.ts"));
// Every user stands at MABEL_EXPERIENCE: points in each ability, partway
// through a circle.

import { vi } from "vitest";
import { type Experience, experienceOf } from "@/experience/experience.ts";
import type * as store from "@/experience/experience-store.ts";

const MABEL_EXPERIENCE: Experience = experienceOf({
  "adding-tasks": 12,
  ideating: 4,
  noting: 1,
  "completing-tasks": 7,
  "completing-quests": 1,
});

const readExperience = vi.fn<typeof store.readExperience>(() =>
  Promise.resolve(MABEL_EXPERIENCE),
);

export { MABEL_EXPERIENCE, readExperience };
