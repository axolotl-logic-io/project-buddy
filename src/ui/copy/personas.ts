// The text of the personas page: the built-in personas and the user's own,
// each with a button that clones it.
import { pageTitle } from "@/ui/copy/site.ts";

export const PERSONAS_COPY = {
  title: pageTitle("Personas"),
  headerLink: "Personas",
  homeLink: "Home",
  heading: "Personas",
  loading: "Loading personas…",
  builtInHeading: "Built-in personas",
  ownHeading: "Your personas",
  noOwn: "No personas of your own yet. Clone one above to make one.",
  clone: "Clone",
  cloneLabel: (name: string): string => `Clone ${name}`,
} as const;
