// Names reserved for construct messages rather than immediate Tasks commands.
const LOCAL_COMMAND_NAMES: readonly string[] = [
  "brainstorm",
  "tasks",
  "stop",
  "help",
  "look",
  "search",
  "cast",
];

function isLocalCommandName(name: string): boolean {
  return LOCAL_COMMAND_NAMES.includes(name.toLowerCase());
}

export { isLocalCommandName };
