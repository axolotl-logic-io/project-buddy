import { pageTitle } from "@/ui/copy/site.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

const RETIREMENT_COPY = {
  title: pageTitle("Forgotten spells"),
  heading: "Forgotten",
  intro:
    "Your forgotten spells. Kept here until you restore or permanently delete them.",
  retire: "Forget",
  retireLabel: (name: string): string => `Forget ${name}`,
  retired:
    "Forgotten. You can restore it from Spellbook’s Forgotten tab. Existing conversations keep their saved settings.",
  restore: "Restore",
  restoreLabel: (name: string): string => `Restore ${name}`,
  restored: "Restored. Available to use again.",
  deleted:
    "Permanently deleted. Existing conversations keep their saved settings.",
  search: "Find something forgotten",
  searchPlaceholder: "Search by name…",
  kindFilter: "Filter by kind",
  allKinds: "All kinds",
  kinds: { spell: "Spells" },
  kind: { spell: "Spell" },
  count: (count: number): string => `${count} forgotten`,
  separator: " · ",
  sort: "Most recently forgotten first",
  dateLabel: "Forgotten",
  empty: "Nothing forgotten. Spells you forget will appear here.",
  noMatches: "No forgotten matches. Try another name.",
  help: "Forgotten spells are unavailable for new use. Existing conversations keep their saved settings.",
  view: "View",
  viewLabel: (name: string): string => `View ${name}`,
  delete: "Delete forever",
  deleteLabel: (name: string): string => `Delete ${name} forever`,
  deleteTitle: (name: string): string => `Delete “${name}” forever?`,
  deleteDescription: (kind: "spell"): string =>
    `This permanently removes your forgotten ${kind} and its saved settings. You cannot undo this or restore it afterward. Existing conversations keep their saved settings.`,
  keep: "Keep forgotten",
  instructions: "Saved settings",
  fields: {
    destination: "Message destination",
    ...SPELLBOOK_COPY.responses,
  },
  loading: "Loading forgotten spells…",
} as const;

export { RETIREMENT_COPY };
