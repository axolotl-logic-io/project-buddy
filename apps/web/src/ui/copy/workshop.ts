import type { PromptKind } from "@/prompts/prompt.ts";
import { pageTitle } from "@/ui/copy/site.ts";

const WORKSHOP_COPY = {
  title: pageTitle("Workshop"),
  heading: "Workshop",
  intro: "Shape a buddy, activity or spell, then put your draft to the test.",
  edit: "At the workbench",
  test: "Try your draft",
  cases: "Test cases",
  caseHint: "Choose a starting point or write your own message.",
  examples: [
    {
      name: "A new idea",
      message: "I want to make a small game, but I’m not sure where to start.",
    },
    {
      name: "An uncertain next step",
      message:
        "I have three ideas and only one afternoon. Help me choose a next step.",
    },
    {
      name: "A direct question",
      message: "What is the difference between a goal and a milestone?",
    },
  ],
  buddy: "Test buddy",
  activity: "Test activity",
  spell: "Spell test",
  decide: "Let the buddy decide",
  force: "Cast before replying",
  forceHint:
    "Casting first tests the instructions, not when the buddy chooses the spell.",
  message: "Test message",
  send: "Test latest draft",
  followUp: "Send follow-up",
  opening: "Test opening request",
  fresh: "New test",
  cancel: "Cancel test",
  pending: "Your buddy is trying the draft…",
  empty: "Your test conversation will appear here.",
  stale:
    "The draft or test settings changed. Your next test starts a fresh conversation.",
  gold: "Tests use gold, just like chat replies.",
  limits:
    "Only spell casting is available here. Tests cannot search the Blender manual, change activities, create quests, update memory, record milestones or generate images. Tests disappear when you leave this page.",
  you: "You",
  reply: "Buddy",
  cast: (name: string): string => `Cast ${name}`,
  version: (version: number): string => `Draft test ${version}`,
  longTest: "This test is full. Choose New test to continue.",
} as const;

// The Workshop's own page: one tab for each kind, where the user writes one
// from scratch, customizes a built-in one, or tweaks or clones their own.
const WORKSHOP_PAGE_COPY = {
  homeLink: "Home",
  intro:
    "Write a construct, activity or spell from scratch, customize a built-in one, or tweak or clone one of your own.",
  loading: "Loading the Workshop…",
  kindsLabel: "What to shape",
  kinds: {
    buddy: "Constructs",
    activity: "Activities",
    spell: "Spells",
  } satisfies Readonly<Record<PromptKind, string>>,
} as const;

export { WORKSHOP_COPY, WORKSHOP_PAGE_COPY };
