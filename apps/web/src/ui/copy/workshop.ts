import type { PromptKind } from "@/prompts/prompt.ts";
import { pageTitle } from "@/ui/copy/site.ts";

const WORKSHOP_COPY = {
  title: pageTitle("Workshop"),
  heading: "Workshop",
  intro:
    "Shape a construct, activity or spell, then save it to use it in a quest or Chat.",
  edit: "At the workbench",
} as const;

// The Workshop's own page: one tab for each kind, where the user crafts one,
// customizes a built-in one, or tweaks or clones their own.
const WORKSHOP_PAGE_COPY = {
  homeLink: "Home",
  intro:
    "Create a construct, activity or spell, make a copy, or edit one of your own.",
  loading: "Loading the Workshop…",
  kindsLabel: "What to shape",
  kinds: {
    construct: "Constructs",
    activity: "Activities",
    spell: "Spells",
  } satisfies Readonly<Record<PromptKind, string>>,
} as const;

export { WORKSHOP_COPY, WORKSHOP_PAGE_COPY };
