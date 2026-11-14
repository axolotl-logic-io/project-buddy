const HELP = [
  "Available commands:",
  "",
  "- `brainstorm` — cast Brainstorm and save subsequent messages to Ideas.",
  "- `plan` — cast Plan and save subsequent messages as Plan steps.",
  "- `stop` — stop the active spell and return to Chat.",
  "- `help` — show these commands.",
  "- `look` — read the construct's visual description.",
  "- `cast <spell id>` — cast Plan or Brainstorm until stopped.",
  "",
  "Commands can also start with `/`. Plan and Brainstorm stay active until stopped. Use the Plan, Ideas and Progress controls to manage your quest.",
].join("\n");

interface LocalConstructCopy {
  readonly welcome: string;
  readonly help: string;
  readonly look: (description: string) => string;
  readonly unknownCommand: string;
  readonly castUsage: string;
  readonly castFailed: string;
  readonly needsQuest: string;
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
  castUsage: "Use `cast plan` or `cast brainstorm` in a quest.",
  castFailed: "The spell could not be cast. Try the command again.",
  needsQuest: "Open a quest to cast Plan or Brainstorm.",
  cast: (name: string): string =>
    `Cast **${name}**. Use stop when you’re finished.`,
};

export { LOCAL_CONSTRUCT_COPY };
