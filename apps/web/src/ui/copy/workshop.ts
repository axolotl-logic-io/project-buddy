import type { PromptKind } from "@/prompts/prompt.ts";
import { pageTitle } from "@/ui/copy/site.ts";

const WORKSHOP_COPY = {
  title: pageTitle("Workshop"),
  heading: "Workshop",
  intro:
    "Shape a construct, activity or spell, then put your draft to the test.",
  edit: "At the workbench",
  test: "Try your draft",
  close: "Back to editing",
  settings: "Test settings",
  chooseCase: "Choose an example…",
  limitsHeading: "Test limits · Only spell casting is available",
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
  construct: "Test construct",
  activity: "Test activity",
  spell: "Spell test",
  decide: "Let the construct decide",
  force: "Cast before replying",
  forceHint:
    "Casting first tests the instructions, not when the construct chooses the spell.",
  message: "Test message",
  send: "Test latest draft",
  followUp: "Send follow-up",
  opening: "Test opening request",
  fresh: "New test",
  cancel: "Cancel test",
  cancelHint:
    "Cancel test stops waiting. Model use already incurred may still spend batteries.",
  cancelled:
    "Stopped waiting for this test. Model use already incurred may still spend batteries.",
  pending: "Your construct is trying the draft…",
  empty: "Your test conversation will appear here.",
  stale:
    "The draft or test settings changed. Your next test starts a fresh conversation.",
  gold: "Tests use batteries, just like adventure replies.",
  limits:
    "Only spell casting is available here. Tests cannot search the Blender manual, change activities, create quests, update Journal, record milestones or generate images. Tests disappear when you leave this page.",
  you: "You",
  reply: "Construct",
  cast: (name: string): string => `Cast ${name}`,
  version: (version: number): string => `Draft test ${version}`,
  longTest: "This test is full. Choose New test to continue.",
} as const;

// The Workshop's own page: one tab for each kind, where the user crafts one,
// customizes a built-in one, or tweaks or clones their own.
const WORKSHOP_PAGE_COPY = {
  homeLink: "Home",
  intro:
    "Craft a construct, activity or spell, customize a built-in one, or tweak or clone one of your own.",
  loading: "Loading the Workshop…",
  kindsLabel: "What to shape",
  kinds: {
    construct: "Constructs",
    activity: "Activities",
    spell: "Spells",
  } satisfies Readonly<Record<PromptKind, string>>,
} as const;

export { WORKSHOP_COPY, WORKSHOP_PAGE_COPY };
