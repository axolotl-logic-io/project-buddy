const HELP = [
  "Available commands:",
  "",
  "- `brainstorm` — start saving subsequent messages to Ideas.",
  "- `plan` — start saving subsequent messages as Plan steps.",
  "- `stop` — stop the current Activity and return to Chat.",
  "- `help` — show these commands.",
  "- `look` — view this conversation's starting context.",
  "- `search <query>` — search the Blender manual.",
  "- `cast <spell id>` — record a spell cast.",
  "",
  "Commands can also start with `/`. Spell casts keep their saved instructions, but this command engine does not interpret them. Use the Plan and progress controls to edit your quest.",
].join("\n");

interface LocalConstructCopy {
  readonly welcome: string;
  readonly help: string;
  readonly look: (context: string) => string;
  readonly unknownCommand: string;
  readonly searchUsage: string;
  readonly castUsage: string;
  readonly searchFailed: string;
  readonly noResults: string;
  readonly citationFailed: string;
  readonly castFailed: string;
  readonly unknownSpell: string;
  readonly cast: (name: string) => string;
}

const LOCAL_CONSTRUCT_COPY: LocalConstructCopy = {
  welcome: `Your construct is ready. Type a command to act.\n\n${HELP}`,
  help: HELP,
  look: (context: string): string => {
    if (context === "") {
      return `You are in a conversation with your construct.\n\n${HELP}`;
    }
    return `Your starting context:\n\n${context}\n\n${HELP}`;
  },
  unknownCommand: `Your message is saved. This construct responds to commands.\n\n${HELP}`,
  searchUsage: "Use `search <query>` to search the Blender manual.",
  castUsage: "Use `cast <spell id>` with an id from Workshop.",
  searchFailed: "The Blender manual search failed. Try the command again.",
  noResults: "The Blender manual has no matching sections. Try another query.",
  citationFailed:
    "The sections were found, but their citations could not be saved.",
  castFailed: "The spell could not be cast. Try the command again.",
  unknownSpell:
    "That spell is unavailable. Choose an available spell id from Workshop.",
  cast: (name: string): string =>
    `Cast **${name}**. The cast is saved; this command engine does not interpret spell instructions.`,
};

export { LOCAL_CONSTRUCT_COPY };
