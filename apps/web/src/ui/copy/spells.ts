const SPELLBOOK_COPY = {
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
    "Add one or more replies. One is chosen randomly each time. Use {{spell}} for the spell’s name, {{bucket}} for Plan or Ideas, {{message}} for the sent message, and {{name}} for your name.",
  responseRequired: "Write a reply for this spell.",
  destination: "Message destination",
  destinationLabel: (destination: string): string =>
    `Message destination: ${destination}`,
  destinationHelp:
    "Choose where subsequent messages are saved while this spell is active.",
  destinations: {
    plan: "Plan",
    brainstorm: "Ideas",
  },
  cast: "Cast spell",
  choose: "Choose a spell",
  command: (name: string): string => `Cast with: cast ${name}`,
  saved: "Saved.",
  builtIn: "Built-in spells are read-only. Make a copy to customize one.",

  builtInHeading: "Built-in spells",
  intro:
    "Create or copy a spell, then customize its replies and message destination. Stop beside the composer ends the spell.",
};
const SPELL_MODE_COPY = {
  castUsage:
    "Use cast followed by the spell’s name, such as cast Plan or cast Brainstorm.",
  ambiguous:
    "Several spells share that name. Rename one in Workshop before casting it.",
  stop: (name: string): string => `Stop ${name}`,
  noQuest: "Open a quest to cast Plan or Brainstorm.",
};

export { SPELL_MODE_COPY, SPELLBOOK_COPY };
