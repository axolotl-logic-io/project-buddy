import { pageTitle } from "@/ui/copy/site.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

const RETIREMENT_COPY = {
  title: pageTitle("Graveyard"),
  heading: "Graveyard",
  intro:
    "Your retired spells. Kept here until you restore or permanently delete them.",
  retire: "Retire",
  retireLabel: (name: string): string => `Retire ${name}`,
  retired:
    "Retired. You can restore it from Graveyard. Existing conversations keep their saved settings.",
  restore: "Restore",
  restoreLabel: (name: string): string => `Restore ${name}`,
  restored: "Restored. Available to use again.",
  deleted:
    "Permanently deleted. Existing conversations keep their saved settings.",
  search: "Find something retired",
  searchPlaceholder: "Search by name…",
  kindFilter: "Filter by kind",
  allKinds: "All kinds",
  kinds: { spell: "Spells" },
  kind: { spell: "Spell" },
  count: (count: number): string => `${count} retired`,
  separator: " · ",
  sort: "Most recently retired first",
  dateLabel: "Retired",
  empty: "Nothing retired. Things you retire will appear here.",
  noMatches: "No retired matches. Try another name.",
  help: "Retired definitions are unavailable for new use. Existing conversations keep their saved settings.",
  view: "View",
  viewLabel: (name: string): string => `View ${name}`,
  delete: "Delete forever",
  deleteLabel: (name: string): string => `Delete ${name} forever`,
  deleteTitle: (name: string): string => `Delete “${name}” forever?`,
  deleteDescription: (kind: "spell"): string =>
    `This permanently removes your retired ${kind} and its saved settings. You cannot undo this or restore it afterward. Existing conversations keep their saved settings.`,
  keep: "Keep retired",
  instructions: "Saved settings",
  fields: {
    destination: "Message destination",
    ...SPELLBOOK_COPY.responses,
  },
  loading: "Loading graveyard…",
} as const;

export { RETIREMENT_COPY };
