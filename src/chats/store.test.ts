// @vitest-environment node
import { NeonDbError } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createChat,
  getChat,
  listChats,
  listMessages,
  saveMessage,
} from "@/chats/store";
import { AppError } from "@/errors/app-error";

// Stands in for the Neon HTTP client so each query can fail as Neon fails.
const neonQuery =
  vi.fn<(sql: string, params: unknown[]) => Promise<{ rows: unknown[][] }>>();

vi.mock("@/db/client", () => ({
  getDb: () => drizzle({ client: neonQuery as never }),
}));

function neonFetchFailure() {
  const error = new NeonDbError(
    "Error connecting to database: TypeError: fetch failed",
  );
  error.sourceError = new TypeError("fetch failed");
  return error;
}

const calls: [string, () => Promise<unknown>][] = [
  ["listChats", () => listChats("project-1")],
  ["getChat", () => getChat("chat-1")],
  [
    "createChat",
    () => createChat({ projectId: "project-1", personaId: "hippy" }),
  ],
  ["listMessages", () => listMessages("chat-1")],
  [
    "saveMessage",
    () =>
      saveMessage("chat-1", {
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "Hi" }],
      }),
  ],
];

describe("chat store", () => {
  beforeEach(() => {
    neonQuery.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(calls)(
    "%s rejects with a logged AppError when the database is unreachable",
    async (operation, call) => {
      neonQuery.mockRejectedValue(neonFetchFailure());

      const error = await call().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).errorCase).toBe("database-unreachable");
      expect(console.error).toHaveBeenCalledWith(
        `[app-error] database-unreachable in ${operation}`,
        expect.any(String),
      );
    },
  );
});
