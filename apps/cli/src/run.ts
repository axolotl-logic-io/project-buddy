// Runs one invocation: reads its arguments, finds its command, makes the
// command's request and writes the answer as JSONL records, or writes help.
// Everything outside the process, such as files, stdin, the network and the
// environment, comes in through Io, so this runs the same in tests.

import { z } from "zod";
import { type ApiAnswer, type ApiConnection, callApi } from "./api-client.ts";
import { type Invocation, readInvocation } from "./arguments.ts";
import {
  COMMANDS,
  type Command,
  type CommandInput,
  commandName,
  RESOURCES,
  type Resource,
} from "./commands.ts";
import { commandHelp, resourceHelp, rootHelp, versionText } from "./help.ts";
import { newRequestId, type RecordWriter, recordWriter } from "./jsonl.ts";
import {
  EXIT_STATUS,
  exitStatusOf,
  InputProblem,
  invalidInput,
  type Problem,
} from "./problems.ts";

// What the process gives an invocation.
interface Io {
  readonly args: readonly string[];
  readonly environment: {
    readonly url: string | undefined;
    readonly session: string | undefined;
  };
  readonly write: (text: string) => void;
  readonly readFile: (path: string) => Promise<string>;
  readonly readStdin: () => Promise<string>;
  readonly fetch: typeof fetch;
  readonly interrupt: AbortSignal;
}

// What an invocation asks for: help or the version, in plain text, or a
// command.
type Plan =
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "command";
      readonly command: Command;
      readonly rest: readonly string[];
    };

const DEFAULT_URL = "http://localhost:3000";

const MILLISECONDS_PER_SECOND = 1000;

const ITEMS = z.array(z.unknown());

const POSITIVE_SECONDS = /^\d+(?:\.\d+)?$/u;

const SIGNED_OUT: Problem = {
  code: "authorization_required",
  message:
    "Set PROJECT_BUDDY_SESSION to the value of the site's session cookie, from a browser signed in to the site.",
  retryable: false,
};

// The problem a failure thrown while reading the invocation makes.
function problemOf(error: unknown): Problem {
  if (error instanceof InputProblem) {
    return invalidInput(error.message, error.field);
  }
  return {
    code: "client_error",
    message: "The command failed unexpectedly before it sent a request.",
    retryable: false,
  };
}

// The command of an action that names one of the resource's, the help for
// a resource named without one, or why neither.
function planForResource(
  resource: Resource,
  invocation: Invocation,
): Plan | Problem {
  const commands = COMMANDS.filter(
    (each: Command) => each.resource === resource.name,
  );
  const [, action, ...rest] = invocation.positionals;
  const [only] = commands;
  if (only?.action === "") {
    return {
      kind: "command",
      command: only,
      rest: invocation.positionals.slice(1),
    };
  }
  if (action === undefined) {
    return { kind: "text", text: resourceHelp(resource) };
  }
  const found = commands.find((each: Command) => each.action === action);
  if (found === undefined) {
    const actions = commands.map((each: Command) => each.action).join(", ");
    return invalidInput(
      `${resource.name} has no action "${action}". Its actions: ${actions}.`,
      "action",
    );
  }
  return { kind: "command", command: found, rest };
}

// What the invocation asks for, or why it asks for nothing that exists.
function planOf(invocation: Invocation): Plan | Problem {
  const [resourceName] = invocation.positionals;
  if (resourceName === undefined) {
    if (invocation.version && !invocation.help) {
      return { kind: "text", text: versionText() };
    }
    return { kind: "text", text: rootHelp() };
  }
  const resource = RESOURCES.find(
    (each: Resource) => each.name === resourceName,
  );
  if (resource === undefined) {
    return invalidInput(
      `There is no resource "${resourceName}". Run project-buddy --help for the resources.`,
      "resource",
    );
  }
  const plan = planForResource(resource, invocation);
  if ("kind" in plan && plan.kind === "command" && invocation.help) {
    return { kind: "text", text: commandHelp(plan.command) };
  }
  return plan;
}

// The command's target, after checking the invocation gives nothing it
// doesn't take.
function targetOf(
  found: Command,
  invocation: Invocation,
  rest: readonly string[],
): string | undefined {
  const name = commandName(found);
  let target: string | undefined;
  let extra = rest;
  if (found.target) {
    [target, ...extra] = rest;
  }
  const [unexpected] = extra;
  if (unexpected !== undefined) {
    throw new InputProblem(
      `${name} takes no argument "${unexpected}". Run project-buddy ${name} --help for usage.`,
      { field: "argument" },
    );
  }
  const takesText = found.options.includes("text");
  for (const option of invocation.options.keys()) {
    const taken =
      found.options.includes(option) || (option === "text-file" && takesText);
    if (!taken) {
      throw new InputProblem(`${name} doesn't take --${option}.`, {
        field: option,
      });
    }
  }
  if (invocation.stdin && !takesText) {
    throw new InputProblem(`${name} doesn't take --stdin.`, { field: "stdin" });
  }
  return target;
}

// The text from the one of --text, --text-file and --stdin given, if any.
async function textOf(
  invocation: Invocation,
  io: Io,
): Promise<string | undefined> {
  const text = invocation.options.get("text");
  const file = invocation.options.get("text-file");
  const sources = [text, file].filter(
    (source: string | undefined) => source !== undefined,
  ).length;
  if (sources + Number(invocation.stdin) > 1) {
    throw new InputProblem(
      "Give the text one way: --text, --text-file or --stdin.",
      { field: "text" },
    );
  }
  if (file !== undefined) {
    try {
      return await io.readFile(file);
    } catch (error: unknown) {
      throw new InputProblem(`Could not read the UTF-8 file "${file}".`, {
        field: "text-file",
        cause: error,
      });
    }
  }
  if (invocation.stdin) {
    try {
      return await io.readStdin();
    } catch (error: unknown) {
      throw new InputProblem("Could not read UTF-8 text from stdin.", {
        field: "stdin",
        cause: error,
      });
    }
  }
  return text;
}

function originOf(invocation: Invocation, io: Io): URL {
  const url = invocation.url ?? io.environment.url ?? DEFAULT_URL;
  try {
    return new URL(url);
  } catch (error: unknown) {
    throw new InputProblem(`"${url}" isn't a URL.`, {
      field: "url",
      cause: error,
    });
  }
}

function deadlineOf(found: Command, invocation: Invocation): AbortSignal {
  const { timeout } = invocation;
  let seconds = found.timeoutSeconds;
  if (timeout !== undefined) {
    seconds = Number(timeout);
    if (!POSITIVE_SECONDS.test(timeout) || seconds <= 0) {
      throw new InputProblem("--timeout must be a number of seconds above 0.", {
        field: "timeout",
      });
    }
  }
  return AbortSignal.timeout(seconds * MILLISECONDS_PER_SECOND);
}

// Writes a successful answer: a list's items, then its count and anything
// else it has, or one record's data.
function writeAnswer(
  found: Command,
  body: Readonly<Record<string, unknown>>,
  writer: RecordWriter,
): number {
  if (!found.list) {
    let data: unknown = body;
    if ("data" in body) {
      ({ data } = body);
    }
    writer.result({ data });
    return EXIT_STATUS.ok;
  }
  const { items, ...meta } = body;
  const parsed = ITEMS.safeParse(items);
  if (!parsed.success) {
    return writeProblem(writer, {
      code: "server_error",
      message: "The site answered a list without its items.",
      retryable: true,
    });
  }
  for (const item of parsed.data) {
    writer.item(item);
  }
  writer.result({ count: parsed.data.length, nextCursor: null, ...meta });
  return EXIT_STATUS.ok;
}

function writeProblem(writer: RecordWriter, problem: Problem): number {
  writer.error(problem);
  return exitStatusOf(problem.code);
}

// Reads the command's inputs, makes its request and writes its answer.
async function runCommand(
  found: Command,
  invocation: Invocation,
  plan: { readonly rest: readonly string[]; readonly io: Io },
  writer: RecordWriter & { readonly requestId: string },
): Promise<number> {
  const { io } = plan;
  let connection: ApiConnection;
  let input: CommandInput;
  try {
    const target = targetOf(found, invocation, plan.rest);
    input = {
      target,
      options: invocation.options,
      text: await textOf(invocation, io),
    };
    connection = {
      origin: originOf(invocation, io),
      session: io.environment.session ?? "",
      requestId: writer.requestId,
      fetch: io.fetch,
      interrupt: io.interrupt,
      deadline: deadlineOf(found, invocation),
    };
  } catch (error: unknown) {
    return writeProblem(writer, problemOf(error));
  }
  let answer: ApiAnswer;
  try {
    const request = found.request(input);
    if (connection.session === "") {
      return writeProblem(writer, SIGNED_OUT);
    }
    answer = await callApi(connection, request);
  } catch (error: unknown) {
    return writeProblem(writer, problemOf(error));
  }
  if (answer.kind === "problem") {
    return writeProblem(writer, answer.problem);
  }
  return writeAnswer(found, answer.body, writer);
}

// Runs the invocation and answers with its exit status. It never throws.
async function run(io: Io): Promise<number> {
  const requestId = newRequestId();
  let invocation: Invocation;
  try {
    invocation = readInvocation(io.args);
  } catch (error: unknown) {
    const writer = recordWriter("project-buddy", requestId, io.write);
    return writeProblem(writer, problemOf(error));
  }
  const plan = planOf(invocation);
  if (!("kind" in plan)) {
    const writer = recordWriter("project-buddy", requestId, io.write);
    return writeProblem(writer, plan);
  }
  if (plan.kind === "text") {
    io.write(plan.text);
    return EXIT_STATUS.ok;
  }
  const writer = recordWriter(commandName(plan.command), requestId, io.write);
  return await runCommand(
    plan.command,
    invocation,
    { rest: plan.rest, io },
    { ...writer, requestId },
  );
}

export type { Io };
export { run };
