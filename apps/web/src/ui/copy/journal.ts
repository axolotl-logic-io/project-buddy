const JOURNAL_SECTIONS_COPY = {
  preferenceNumber: (number: number): string => `Preference #${number}`,
  sectionVersion: (kind: "goal" | "preferences", version: number): string =>
    `${JOURNAL_SECTIONS_COPY[kind]} · Version ${version}`,
  versionAuthor: (version: number, author: "person" | "construct"): string =>
    `Version ${version} · ${JOURNAL_SECTIONS_COPY[author]}`,
  editGoal: "Edit goal",
  editPreferences: "Edit preferences",
  commands: [
    {
      command: "/preferences",
      usage: "/preferences",
      description: "Show preferences",
    },
    {
      command: "/prefer",
      usage: "/prefer TEXT",
      description: "Add a preference",
    },
    {
      command: "/preference",
      usage: "/preference NUMBER TEXT",
      description: "Edit a preference",
    },
    {
      command: "/unprefer",
      usage: "/unprefer NUMBER",
      description: "Remove a preference",
    },
    {
      command: "/move-preference",
      usage: "/move-preference NUMBER BEFORE (or end)",
      description: "Move a preference",
    },
  ],
  goal: "Goal",
  preferences: "Preferences",
  save: "Save goal",
  add: "Add preference",
  edit: "Save preference",
  up: "Move up",
  down: "Move down",
  remove: "Remove",
  undo: "Undo",
  emptyGoal: "No goal agreed yet.",
  emptyPreferences: "No preferences recorded yet.",
  goalIntro:
    "What you want to achieve. Changes use no model and spend no batteries.",
  preferencesIntro:
    "How you prefer to work. Add, edit, reorder or remove preferences without a model call.",
  text: "Preference",
  goalText: "Goal text",
  changed: "Saved. No batteries spent.",
  conflict:
    "This section changed. Reload to read the current version before editing again.",
  failed: "The change was not saved. Check the text and try again.",
  unchanged: "Nothing changed.",
  history: "Section versions",
  construct: "Construct",
  person: "You",
  changeLabel: "Journal section change",
  before: "Before",
  after: "After",
  cleared: "Cleared",
  undone: "Undone",
  version: (version: number): string => `Version ${version}`,
  commandHelp:
    "Use /preferences to show preferences, /prefer text to add, /preference number text to edit, /unprefer number to remove, or /move-preference number before-number (or end) to reorder.",
};

export { JOURNAL_SECTIONS_COPY };
