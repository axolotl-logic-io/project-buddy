import process from "node:process";

const SHELL_QUOTE = /'/gu;
const REGEX_CHARACTER = /[.*+?^${}()|[\]\\]/gu;

function quoteArgument(argument: string): string {
  return `'${argument.replace(SHELL_QUOTE, "'\\''")}'`;
}

function literalPattern(value: string): string {
  return value.replace(REGEX_CHARACTER, "\\$&");
}

function printRerun(command: string, args: readonly string[] = []): void {
  const suffix = args.map(quoteArgument).join(" ");
  process.stdout.write(
    `RERUN: ${[command, suffix].filter(Boolean).join(" ")}\n`,
  );
}

export { literalPattern, printRerun };
