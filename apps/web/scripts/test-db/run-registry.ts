// Records registrations before granting execution. Cleanup asks authenticated
// participants to stop and verifies disappearance, never kills journalled PIDs.
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer as createSocketServer, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestRunProtocol } from "../../src/env.ts";
import {
  invocationProcessesRemain,
  type RunOwnership,
} from "./run-ownership.ts";
import { messages, STOP_DEADLINE_MS, send, waitUntil } from "./run-protocol.ts";

const TOKEN_BYTES = 16;
interface Registry {
  readonly protocol: TestRunProtocol;
  readonly stop: () => Promise<void>;
}
interface RegistryState {
  readonly sockets: Set<Socket>;
  readonly registered: Set<Socket>;
  readonly members: Map<number, boolean>;
  registering: number;
  stopping: boolean;
  failure: unknown;
}
function attach(
  socket: Socket,
  ownership: RunOwnership,
  token: string,
  state: RegistryState,
): void {
  state.sockets.add(socket);
  socket.on("error", (error: Error) => {
    state.failure = error;
  });
  socket.once("close", () => {
    state.sockets.delete(socket);
    state.registered.delete(socket);
  });
  messages(socket, (message) => {
    if (
      message.kind !== "hello" ||
      message.token !== token ||
      state.registered.has(socket)
    ) {
      socket.destroy(new Error("Unproven test process registration."));
      return;
    }
    state.members.set(message.pid, message.group);
    state.registered.add(socket);
    state.registering += 1;
    ownership.register(message.pid, message.group).then(
      () => {
        state.registering -= 1;
        if (!socket.destroyed) {
          if (state.stopping) {
            send(socket, { kind: "stop" });
          } else {
            send(socket, { kind: "ready" });
          }
        }
      },
      (error: unknown) => {
        state.registering -= 1;
        state.failure = error;
        socket.destroy();
      },
    );
  });
}
function bind(
  server: ReturnType<typeof createSocketServer>,
  path: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(path, resolve);
  });
}
async function closeRegistry(
  server: ReturnType<typeof createSocketServer>,
  sockets: ReadonlySet<Socket>,
  directory: string,
): Promise<void> {
  for (const socket of sockets) {
    socket.destroy();
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(directory, { recursive: true });
}
async function registry(ownership: RunOwnership): Promise<Registry> {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const directory = await mkdtemp(join(tmpdir(), "pb-lifecycle-"));
  const path = join(directory, "socket");
  const state: RegistryState = {
    sockets: new Set(),
    registered: new Set(),
    members: new Map(),
    registering: 0,
    stopping: false,
    failure: undefined,
  };
  const server = createSocketServer((socket) =>
    attach(socket, ownership, token, state),
  );
  try {
    await bind(server, path);
  } catch (error) {
    await rm(directory, { recursive: true });
    throw error;
  }
  return {
    protocol: {
      socket: path,
      token,
      entry: new URL("./run.ts", import.meta.url).href,
    },
    stop: async (): Promise<void> => {
      state.stopping = true;
      for (const socket of state.sockets) {
        if (state.registered.has(socket)) {
          send(socket, { kind: "stop" });
        } else {
          socket.destroy();
        }
      }
      try {
        await waitUntil(
          () =>
            !invocationProcessesRemain(state.members) &&
            state.sockets.size === 0 &&
            state.registering === 0,
          "Supported process cleanup",
          STOP_DEADLINE_MS,
        );
        if (state.failure !== undefined) {
          throw state.failure;
        }
      } finally {
        await closeRegistry(server, state.sockets, directory);
      }
    },
  };
}

export type { Registry };
export { registry };
