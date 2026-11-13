import { pageTitle } from "@/ui/copy/site.ts";

const WORKSHOP_COPY = {
  title: pageTitle("Workshop"),
  heading: "Workshop",
  intro: "Shape a construct or explore Plan and Brainstorm spells.",
  edit: "At the workbench",
} as const;

// Workshop has one collection tab per kind and the same editing actions.
const WORKSHOP_PAGE_COPY = {
  intro:
    "Create or edit constructs, or explore the Plan and Brainstorm spells.",
  loading: "Loading the Workshop…",
  kindsLabel: "What to shape",
  kinds: {
    construct: "Constructs",
    spell: "Spells",
  } satisfies Readonly<Record<"construct" | "spell", string>>,
} as const;

export { WORKSHOP_COPY, WORKSHOP_PAGE_COPY };
