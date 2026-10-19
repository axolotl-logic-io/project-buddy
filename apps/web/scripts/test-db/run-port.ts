// Invocation port reservation. Release is a capability, not a readiness probe.
import { randomBytes } from "node:crypto";
import { lstat, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import {
  readEndToEndPortIfSet,
  readTestPortTokenIfSet,
} from "../../src/env.ts";
import { isProcessAlive } from "./run-ownership.ts";
import { checkTestEnvironment } from "./test-database.ts";

const TOKEN_BYTES = 16;
const CLAIM_NAME = /^(?<port>\d{1,5})_(?<pid>[1-9]\d{0,9})_[\da-f]{32}$/u;
const DIRECTORY_MODE = 0o700;
const FILE_MODE = 0o600;
const PERMISSIONS_RADIX = 8;
const UNAVAILABLE = 503;
const RELEASE_TIMEOUT_MS = 30_000;
const MAX_PORT_SELECTIONS = 32;
const CLAIM_CONFLICT = "invocation-port-claim";
interface PortLease {
  readonly port: number;
  readonly token: string;
  readonly close: () => Promise<void>;
}

async function closeServer(server: Server): Promise<void> {
  if (!server.listening) {
    return;
  }
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error !== undefined) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

// Each claim has a unique immutable filename. Dead claims are ignored, not
// unlinked: two cleaners cannot unlink a newly acquired replacement lock.
async function claimPort(
  port: number,
  token: string,
): Promise<() => Promise<void>> {
  const uid = process.getuid?.();
  if (uid === undefined) {
    throw new Error("Test run port ownership requires a POSIX host.");
  }
  const directory = join(tmpdir(), `project-buddy-test-ports-${uid}`);
  await mkdir(directory, { recursive: true, mode: DIRECTORY_MODE });
  const info = await lstat(directory);
  if (
    !info.isDirectory() ||
    info.uid !== uid ||
    !info.mode.toString(PERMISSIONS_RADIX).endsWith("00")
  ) {
    throw new Error(
      "The test port claim directory must be private and owned by this user.",
    );
  }
  const own = `${port}_${process.pid}_${token}`;
  const path = join(directory, own);
  await writeFile(path, "", { flag: "wx", mode: FILE_MODE });
  try {
    const names = await readdir(directory);
    const competing = names.some((name) => {
      const { port: claimedPort, pid } = CLAIM_NAME.exec(name)?.groups ?? {};
      return (
        name !== own &&
        Number(claimedPort) === port &&
        pid !== undefined &&
        isProcessAlive(Number(pid))
      );
    });
    if (competing) {
      throw new Error(
        `Test port ${port} is owned by another test run; refusing to reuse it.`,
        { cause: CLAIM_CONFLICT },
      );
    }
    return () => unlink(path);
  } catch (error) {
    await unlink(path);
    throw error;
  }
}

async function reservePort(
  port: number | undefined,
  attempt = 0,
): Promise<PortLease> {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const server = createServer((request, response) => {
    if (request.method === "POST" && request.url === `/${token}`) {
      response.end();
      server.close();
      return;
    }
    response.writeHead(UNAVAILABLE, { connection: "close" });
    response.end("Test run port reserved; no application is listening yet.");
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", (error: Error) =>
      reject(
        new Error(
          `Requested test port ${port ?? "automatic"} is unavailable.`,
          { cause: error },
        ),
      ),
    );
    server.listen(port ?? 0, resolve);
  });
  try {
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("The reserved test port has no address.");
    }
    const unclaim = await claimPort(address.port, token);
    return {
      port: address.port,
      token,
      close: async (): Promise<void> => {
        try {
          await closeServer(server);
        } finally {
          await unclaim();
        }
      },
    };
  } catch (error) {
    await closeServer(server);
    if (
      port === undefined &&
      attempt < MAX_PORT_SELECTIONS &&
      error instanceof Error &&
      error.cause === CLAIM_CONFLICT
    ) {
      return reservePort(undefined, attempt + 1);
    }
    throw error;
  }
}

async function releasePort(): Promise<void> {
  checkTestEnvironment();
  const token = readTestPortTokenIfSet();
  if (token === undefined) {
    return;
  }
  const port = readEndToEndPortIfSet();
  const response = await fetch(`http://127.0.0.1:${port}/${token}`, {
    method: "POST",
    signal: AbortSignal.timeout(RELEASE_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Test port ${port} did not release its owned reservation.`);
  }
  await response.text();
}

export type { PortLease };
export { releasePort, reservePort };
