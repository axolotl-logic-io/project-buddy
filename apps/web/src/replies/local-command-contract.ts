// Names reserved for construct messages rather than immediate Plan commands.
const LOCAL_COMMAND_NAMES: readonly string[] = [
  "brainstorm",
  "plan",
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
