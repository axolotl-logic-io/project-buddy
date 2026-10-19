// Authenticated local lifecycle messages; every registration has a deadline.
import { connect, type Socket } from "node:net";
import process from "node:process";
import { z } from "zod";
import type { TestRunProtocol } from "../../src/env.ts";

const STOP_DEADLINE_MS = 15_000;
const GROUP_POLL_MS = 50;
const MAX_MESSAGE_LENGTH = 8192;
const MESSAGE = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("hello"),
    token: z.string(),
    pid: z.number().int().positive(),
    group: z.boolean(),
  }),
  z.object({ kind: z.literal("ready") }),
  z.object({ kind: z.literal("stop") }),
]);
function send(socket: Socket, message: z.infer<typeof MESSAGE>): void {
  socket.write(`${JSON.stringify(message)}\n`);
}
function messages(
  socket: Socket,
  receive: (message: z.infer<typeof MESSAGE>) => void,
): void {
  let pending = "";
  socket.setEncoding("utf8");
  socket.on("data", (data: string) => {
    pending += data;
    if (pending.length > MAX_MESSAGE_LENGTH) {
      socket.destroy(new Error("Oversized test lifecycle message."));
      return;
    }
    let newline = pending.indexOf("\n");
    while (newline !== -1) {
      const line = pending.slice(0, newline);
      pending = pending.slice(newline + 1);
      try {
        receive(MESSAGE.parse(JSON.parse(line)));
      } catch (error) {
        socket.destroy(
          new Error("Invalid test lifecycle message.", { cause: error }),
        );
      }
      newline = pending.indexOf("\n");
    }
  });
}
function deadline<T>(
  promise: Promise<T>,
  label: string,
  within = STOP_DEADLINE_MS,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} exceeded its bounded deadline.`)),
      within,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
// Poll only for OS group disappearance (there is no portable group-exit event).
// The deadline cancels the poll itself, not merely its caller's Promise.
function waitUntil(
  check: () => boolean,
  label: string,
  within: number,
): Promise<void> {
  const end = Date.now() + within;
  return new Promise((resolve, reject) => {
    function poll(): void {
      try {
        if (check()) {
          resolve();
          return;
        }
        if (Date.now() >= end) {
          reject(new Error(`${label} exceeded its bounded deadline.`));
          return;
        }
        setTimeout(poll, GROUP_POLL_MS);
      } catch (error) {
        reject(error);
      }
    }
    poll();
  });
}

// The caller owns this connection. Losing the runner is also a handled stop;
// SIGKILL of the runner itself cannot run its database cleanup.
async function rendezvous(
  protocol: TestRunProtocol,
  group: boolean,
  stop: () => void,
): Promise<Socket> {
  const socket = connect(protocol.socket);
  const ready = new Promise<Socket>((resolve, reject) => {
    socket.once("error", reject);
    socket.once("connect", () =>
      send(socket, {
        kind: "hello",
        token: protocol.token,
        pid: process.pid,
        group,
      }),
    );
    messages(socket, (message) => {
      if (message.kind === "ready") {
        resolve(socket);
      } else if (message.kind === "stop") {
        stop();
      }
    });
    socket.once("close", () => {
      reject(new Error("Test runner lifecycle connection closed."));
      if (!socket.writableEnded) {
        stop();
      }
    });
  });
  try {
    return await deadline(ready, "Lifecycle registration");
  } catch (error) {
    socket.destroy();
    throw error;
  }
}

export { messages, rendezvous, STOP_DEADLINE_MS, send, waitUntil };
