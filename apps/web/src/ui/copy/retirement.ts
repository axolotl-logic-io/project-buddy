import type { PromptKind } from "@/prompts/prompt.ts";
import { pageTitle } from "@/ui/copy/site.ts";

const RETIREMENT_COPY = {
  title: pageTitle("Retirement"),
  heading: "Retirement",
  intro:
    "Your retired constructs, activities, and spells. Kept here until you restore or permanently delete them.",
  home: "Home",
  retire: "Retire",
  retireLabel: (name: string): string => `Retire ${name}`,
  retired:
    "Retired. You can restore it from Retirement. Existing adventures keep their saved instructions and past casts.",
  restore: "Restore",
  restoreLabel: (name: string): string => `Restore ${name}`,
  restored: "Restored. Available to use again.",
  deleted:
    "Permanently deleted. Existing adventures keep their saved instructions and past casts.",
  search: "Find something retired",
  searchPlaceholder: "Search by name…",
  kindFilter: "Filter by kind",
  allKinds: "All kinds",
  kinds: { construct: "Constructs", activity: "Activities", spell: "Spells" },
  kind: { construct: "Construct", activity: "Activity", spell: "Spell" },
  count: (count: number): string => `${count} retired`,
  separator: " · ",
  sort: "Most recently retired first",
  date: (date: string): string => `Retired ${date}`,
  empty: "Nothing retired. Things you retire will appear here.",
  noMatches: "No retired matches. Try another name or kind.",
  help: "Retired definitions are unavailable for new use. Existing adventures keep their saved instructions and past spell casts.",
  view: "View",
  viewLabel: (name: string): string => `View ${name}`,
  delete: "Delete forever",
  deleteLabel: (name: string): string => `Delete ${name} forever`,
  deleteTitle: (name: string): string => `Delete “${name}” forever?`,
  deleteDescription: (kind: PromptKind): string =>
    `This permanently removes your retired ${kind} and its saved instructions. You cannot undo this or restore it afterward. Existing adventures keep their saved instructions and past casts.`,
  keep: "Keep retired",
  instructions: "Saved instructions",
  fields: {
    prompt: "Instructions",
    openingRequest: "Opening request",
    whenToUse: "When to use",
  },
  marketplace:
    "Published Marketplace listings remain available until you unlist them. Retirement and permanent deletion do not unlist them.",
  bought:
    "This copy came from the Marketplace. Restoring it costs no gold. Permanent deletion gives no refund; buying another copy may cost gold.",
  fallback:
    "If this was your preferred interview construct, new quests use Vellum while it is retired. Restoring makes it available as your preference again.",
  loading: "Loading retirement…",
} as const;

export { RETIREMENT_COPY };
