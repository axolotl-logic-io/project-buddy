// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createChat,
  getChat,
  listChats,
  listMessages,
  saveMessage,
} from "@/chats/store.ts";
import { FAKE_DATABASE_URL, fakeNeonHttp } from "@/db/fake-neon-http.ts";
import { AppError } from "@/errors/app-error.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";

const calls: [string, () => Promise<unknown>][] = [
  ["listChats", (): Promise<unknown> => listChats("project-1")],
  ["getChat", (): Promise<unknown> => getChat("chat-1")],
  [
    "createChat",
    (): Promise<unknown> =>
      createChat({ projectId: "project-1", personaId: "hippy" }),
  ],
  ["listMessages", (): Promise<unknown> => listMessages("chat-1")],
  [
    "saveMessage",
    (): Promise<unknown> =>
      saveMessage("chat-1", {
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "Hi" }],
      }),
  ],
];

describe("chat store", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
    vi.stubGlobal("fetch", fakeNeonHttp({ kind: "unreachable" }).fetch);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test.each(calls)(
    "%s rejects with a logged AppError when the database is unreachable",
    async (operation, call) => {
      const log = spyOnErrorLog();

      const error = await call().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(AppError);
      expect(error).toHaveProperty("errorCase", "database-unreachable");
      expect(log).toHaveBeenCalledWith(
        `[app-error] database-unreachable in ${operation}`,
        expect.any(String),
      );
    },
  );
});
