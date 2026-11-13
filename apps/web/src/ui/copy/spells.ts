const SPELLBOOK_COPY = {
  loading: "Loading spell…",
  builtInHeading: "Spells",
  intro:
    "Cast Plan or Brainstorm in a quest to save subsequent messages to that bucket. Stop beside the composer ends the spell.",
};
const SPELL_MODE_COPY = {
  castUsage: "Cast Plan or Brainstorm: use cast plan or cast brainstorm.",
  stop: (name: string): string => `Stop ${name}`,
  started: (name: string): string => {
    let bucket = "Plan";
    if (name === "Brainstorm") {
      bucket = "Ideas";
    }
    return `Cast ${name}. Subsequent messages go into ${bucket}. Use stop when you’re finished.`;
  },
  stopped: "Spell stopped. Back to Chat.",
  noQuest: "Open a quest to cast Plan or Brainstorm.",
  ideaSaved: "Saved to Ideas.",
  planSaved: "Saved to Plan.",
  invalid: "Use 1 to 200 characters for each idea or Plan step.",
  full: "The Plan is full. Your message is saved in the conversation; make room before adding this step.",
};

export { SPELL_MODE_COPY, SPELLBOOK_COPY };
