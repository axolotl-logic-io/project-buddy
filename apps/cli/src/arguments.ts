// Reads an invocation's arguments: the resource, action and target
// positionals, and the options, which may come before or after them.

import { parseArgs } from "node:util";
import { InputProblem } from "./problems.ts";

// The options a command may take as values.
const COMMAND_OPTIONS = [
  "quest",
  "status",
  "from",
  "name",
  "why",
  "context",
  "text",
  "text-file",
  "revision",
  "before",
  "spell",
] as const;

type CommandOption = (typeof COMMAND_OPTIONS)[number];

const PARSE_OPTIONS = {
  help: { type: "boolean", short: "h" },
  version: { type: "boolean" },
  url: { type: "string" },
  timeout: { type: "string" },
  stdin: { type: "boolean" },
  quest: { type: "string" },
  status: { type: "string" },
  from: { type: "string" },
  name: { type: "string" },
  why: { type: "string" },
  context: { type: "string" },
  text: { type: "string" },
  "text-file": { type: "string" },
  revision: { type: "string" },
  before: { type: "string" },
  spell: { type: "string" },
} as const;

// An invocation as given: its positionals, the shared options, and each
// command option given, by name.
interface Invocation {
  readonly positionals: readonly string[];
  readonly help: boolean;
  readonly version: boolean;
  readonly url: string | undefined;
  readonly timeout: string | undefined;
  readonly stdin: boolean;
  readonly options: ReadonlyMap<CommandOption, string>;
}

// parseArgs names the option it rejects in quotes, such as '--colour'.
const QUOTED = /'(?<quoted>[^']+)'/u;
const OPTION_NAME = /^--?(?<name>[^=]+)/u;
const NO_GROUPS: Readonly<Record<string, string>> = {};

const COMMAND_OPTION_NAMES: readonly string[] = COMMAND_OPTIONS;

function isCommandOption(name: string): name is CommandOption {
  return COMMAND_OPTION_NAMES.includes(name);
}

// The option an error from parseArgs names, if any.
function optionNamed(message: string): string | undefined {
  const { quoted = "" } = QUOTED.exec(message)?.groups ?? NO_GROUPS;
  const { name } = OPTION_NAME.exec(quoted)?.groups ?? NO_GROUPS;
  return name;
}

// The invocation the arguments make. Throws an InputProblem for an unknown
// option, or an option without its value.
function readInvocation(args: readonly string[]): Invocation {
  let parsed: ReturnType<
    typeof parseArgs<{
      args: string[];
      options: typeof PARSE_OPTIONS;
      allowPositionals: true;
      tokens: true;
    }>
  >;
  try {
    parsed = parseArgs({
      args: [...args],
      options: PARSE_OPTIONS,
      allowPositionals: true,
      tokens: true,
    });
  } catch (error: unknown) {
    let message = "The arguments are invalid.";
    if (error instanceof Error) {
      ({ message } = error);
    }
    throw new InputProblem(`${message} Run project-buddy --help for usage.`, {
      field: optionNamed(message),
      cause: error,
    });
  }
  const options = new Map<CommandOption, string>();
  for (const token of parsed.tokens) {
    if (
      token.kind === "option" &&
      isCommandOption(token.name) &&
      token.value !== undefined
    ) {
      options.set(token.name, token.value);
    }
  }
  const { values } = parsed;
  return {
    positionals: parsed.positionals,
    help: values.help ?? false,
    version: values.version ?? false,
    url: values.url,
    timeout: values.timeout,
    stdin: values.stdin ?? false,
    options,
  };
}

export type { CommandOption, Invocation };
export { readInvocation };
