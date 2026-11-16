// Starts the installed project-buddy command as a process, against a fake
// site on a local port that records each request and answers it as a test
// scripts.

import { spawn } from "node:child_process";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { text } from "node:stream/consumers";

// A request as the fake site saw it.
interface SiteRequest {
  readonly method: string;
  readonly url: string;
  readonly cookie: string | undefined;
  readonly body: string;
}

// How the fake site answers: a status and JSON body, or never.
type SiteAnswer =
  | { readonly status: number; readonly body: unknown }
  | { readonly hang: true };

interface FakeSite {
  readonly url: string;
  readonly requests: readonly SiteRequest[];
  readonly close: () => Promise<void>;
}

interface ProcessOutcome {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

const BIN = resolve(
  import.meta.dirname,
  "../../../../node_modules/.bin/project-buddy",
);

const PROCESS_TIMEOUT_MILLISECONDS = 10_000;

async function startSite(answer: SiteAnswer): Promise<FakeSite> {
  const requests: SiteRequest[] = [];
  const server: Server = createServer(
    async (request: IncomingMessage, response: ServerResponse) => {
      requests.push({
        method: request.method ?? "",
        url: request.url ?? "",
        cookie: request.headers.cookie,
        body: await text(request),
      });
      if ("hang" in answer) {
        return;
      }
      response.writeHead(answer.status, { "content-type": "application/json" });
      response.end(JSON.stringify(answer.body));
    },
  );
  await new Promise<void>((done: () => void) => {
    server.listen(0, "127.0.0.1", done);
  });
  const address: AddressInfo | string | null = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("The fake site has no port.");
  }
  const { port } = address;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: (): Promise<void> =>
      new Promise<void>((done: () => void) => {
        server.closeAllConnections();
        server.close((): void => {
          done();
        });
      }),
  };
}

// The site and session the command is given in its environment.
interface Connection {
  readonly url?: string;
  readonly session?: string;
}

// Runs the command with the arguments, the site and session, and stdin.
function runProcess(
  args: readonly string[],
  { url, session }: Connection = {},
  stdin = "",
): Promise<ProcessOutcome> {
  // spawn leaves out a variable whose value is undefined, so the
  // command never sees this shell's own session.
  const child = spawn(BIN, args, {
    env: {
      ...process.env,
      PROJECT_BUDDY_URL: url,
      PROJECT_BUDDY_SESSION: session,
    },
    timeout: PROCESS_TIMEOUT_MILLISECONDS,
  });
  child.stdin.end(stdin);
  const stdout = text(child.stdout);
  const stderr = text(child.stderr);
  return new Promise<ProcessOutcome>(
    (done: (outcome: ProcessOutcome) => void) => {
      child.on("close", async (status: number | null): Promise<void> => {
        done({ status, stdout: await stdout, stderr: await stderr });
      });
    },
  );
}

export type { FakeSite, SiteRequest };
export { runProcess, startSite };
