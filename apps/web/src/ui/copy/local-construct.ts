const HELP = [
  "Available commands:",
  "",
  "- `help` — show these commands.",
  "- `look` — read the construct's visual description.",
  "- `search <query>` — search the Blender manual.",
  "- `cast <spell id>` — record a spell cast.",
  "",
  "Commands can also start with `/`. Spell casts keep their saved instructions, but this command engine does not interpret them. Use the Plan and progress controls to edit your quest.",
].join("\n");

interface LocalConstructCopy {
  readonly welcome: string;
  readonly help: string;
  readonly look: (description: string) => string;
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
  look: (description: string): string => {
    if (description === "") {
      return `This construct has no visual description.\n\n${HELP}`;
    }
    return `Visual description:\n\n${description}\n\n${HELP}`;
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
