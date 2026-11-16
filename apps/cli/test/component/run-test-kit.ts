// Runs the CLI in-process against a fake site: each request is recorded,
// and answered with the next scripted response.

import { run } from "../../src/run.ts";

// A request as the fake site saw it.
interface SeenRequest {
  readonly method: string;
  readonly url: URL;
  readonly cookie: string | null;
  readonly body: unknown;
}

// What a test's invocation did: its exit status, its stdout as records,
// its plain text, and the requests it sent.
interface RunOutcome {
  readonly status: number;
  readonly records: readonly Readonly<Record<string, unknown>>[];
  readonly text: string;
  readonly requests: readonly SeenRequest[];
}

interface RunSetup {
  readonly responses?: readonly (Response | Error)[];
  readonly session?: string | undefined;
  readonly files?: Readonly<Record<string, string>>;
  readonly stdin?: string;
}

const SESSION = "test-session";

function bodyOf(init: RequestInit | undefined): unknown {
  const body = init?.body;
  if (typeof body !== "string") {
    return undefined;
  }
  return JSON.parse(body);
}

function recordOf(line: string): Readonly<Record<string, unknown>> {
  const record: unknown = JSON.parse(line);
  if (typeof record !== "object" || record === null) {
    throw new Error(`Not a record: ${line}`);
  }
  return { ...record };
}

async function runCli(
  args: readonly string[],
  setup: RunSetup = {},
): Promise<RunOutcome> {
  const responses = [...(setup.responses ?? [])];
  const requests: SeenRequest[] = [];
  let output = "";
  function fakeFetch(
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> {
    requests.push({
      method: init?.method ?? "GET",
      url: new URL(String(input)),
      cookie: new Headers(init?.headers).get("cookie"),
      body: bodyOf(init),
    });
    const next = responses.shift() ?? Response.json({ data: {} });
    if (next instanceof Error) {
      return Promise.reject(next);
    }
    return Promise.resolve(next);
  }
  let session: string | undefined = SESSION;
  if ("session" in setup) {
    ({ session } = setup);
  }
  const status = await run({
    args,
    environment: { url: "http://site.test", session },
    write: (text: string): void => {
      output += text;
    },
    readFile: (path: string): Promise<string> => {
      const file = setup.files?.[path];
      if (file === undefined) {
        return Promise.reject(new Error(`No file ${path}`));
      }
      return Promise.resolve(file);
    },
    readStdin: (): Promise<string> => Promise.resolve(setup.stdin ?? ""),
    fetch: fakeFetch,
    interrupt: new AbortController().signal,
  });
  let records: Readonly<Record<string, unknown>>[] = [];
  if (output.startsWith("{")) {
    records = output.trimEnd().split("\n").map(recordOf);
  }
  return { status, records, text: output, requests };
}

export type { RunOutcome, SeenRequest };
export { runCli, SESSION };
