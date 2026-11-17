import { pageTitle } from "@/ui/copy/site.ts";

const SPELLBOOK_COPY = {
  heading: "Spellbook",
  results: (count: number): string => {
    if (count === 1) {
      return "1 spell";
    }
    return `${count} spells`;
  },
  filterCount: (label: string, count: number): string => `${label} · ${count}`,
  title: pageTitle("Spellbook"),
  collectionLoading: "Loading Spellbook…",
  search: "Search spells by name",
  filters: "Filter spells",
  all: "All",
  forgotten: "Forgotten",
  builtInFilter: "Built-in",
  ownFilter: "Yours",
  view: "View",
  edit: "Edit",
  noMatches: "No spells match. Try another name or filter.",
  empty:
    "You have no spells of your own yet. Create one or copy a built-in spell.",
  help: "Cast and stop spells inside a quest. Copy and forget actions are on each spell’s page.",
  loading: "Loading spell…",
  ownHeading: "Your spells",
  newSpell: "Create spell",
  newName: "Untitled spell",
  customize: "Make a copy",
  copy: "Copy",
  name: "Spell",
  settings: "Spell Messages",
  responses: {
    castReply: "Reply when cast",
    savedReply: "Reply when a message is saved",
    stopReply: "Reply when stopped",
    invalidReply: "Reply when a message is invalid",
  },
  responsesHelp:
    "Add one or more replies. One is chosen randomly each time. Use {{spell}} for the spell’s name, {{bucket}} for Tasks or Ideas, {{message}} for the sent message, and {{name}} for your name.",
  responseRequired: "Write a reply for this spell.",
  destination: "Message destination",
  collectionDestination: (destination: string): string =>
    `Saves to ${destination}`,
  destinationLabel: (destination: string): string =>
    `Message destination: ${destination}`,
  destinationHelp:
    "Choose where subsequent messages are saved while this spell is active.",
  destinations: {
    tasks: "Tasks",
    brainstorm: "Ideas",
  },
  cast: "Cast spell",
  choose: "Choose a spell",
  command: (name: string): string => `Cast with: cast ${name}`,
  saved: "Saved.",
  builtIn: "Built-in spells are read-only. Make a copy to customize one.",

  builtInHeading: "Built-in spells",
  intro: "Find a spell to inspect or customize.",
};
const SPELL_MODE_COPY = {
  castUsage:
    "Use cast followed by the spell’s name, such as cast Tasks or cast Brainstorm.",
  ambiguous:
    "Several spells share that name. Rename one in Spellbook before casting it.",
  stop: (name: string): string => `Stop ${name}`,
  active: (name: string): string => `${name} active`,
};

export { SPELL_MODE_COPY, SPELLBOOK_COPY };
