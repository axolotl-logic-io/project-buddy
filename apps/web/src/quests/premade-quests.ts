import type { ConstructId } from "@/constructs/index.ts";

type PremadeQuestId = "dailies" | "learn" | "make" | "do";

interface PremadeQuest {
  readonly id: PremadeQuestId;
  readonly name: string;
  // One short line, for where the starting points are shown side by side.
  readonly tagline: string;
  // What it is for, in a sentence or two, shown with its details.
  readonly description: string;
  readonly context: string;
  readonly constructId: ConstructId;
}

interface QuestStartPreset {
  readonly name?: string | undefined;
  readonly context?: string | undefined;
}

const PREMADE_QUESTS: readonly PremadeQuest[] = [
  {
    id: "dailies",
    name: "Dailies",
    tagline: "Start your day",
    description:
      "Start each day here: notice what matters and choose one manageable next step. One ongoing quest you come back to.",
    context: "",
    constructId: "vellum",
  },
  {
    id: "learn",
    name: "Learn a thing",
    tagline: "Practise a skill",
    description:
      "Find your starting point and learn by doing, one small practice step at a time.",
    context: "",
    constructId: "vellum",
  },
  {
    id: "make",
    name: "Make a thing",
    tagline: "Build a first version",
    description:
      "Discover what you want to make and get to a small first version.",
    context: "",
    constructId: "lumen",
  },
  {
    id: "do",
    name: "Do a thing",
    tagline: "Reach an outcome",
    description:
      "Any other outcome you want: break it into steps and take the first one.",
    context: "",
    constructId: "lumen",
  },
];

export type { PremadeQuest, PremadeQuestId, QuestStartPreset };
export { PREMADE_QUESTS };
