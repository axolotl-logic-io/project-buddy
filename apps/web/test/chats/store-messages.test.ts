// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { listMessages } from "@/chats/store.ts";
import { FAKE_DATABASE_URL } from "../db/fake-neon-http.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { chatIdFixture, userIdFixture } from "../id-fixtures.ts";
import { storedRows } from "./stored-rows.ts";

const INVALID_ROLE_ID = "invalid-role-message";
const INVALID_PARTS_ID = "invalid-parts-message";
const PRIVATE_ROLE_TEXT = "Private question in an invalid role";
const PRIVATE_PARTS_TEXT = "Private question in malformed parts";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("listMessages skips invalid role and parts rows, logging their IDs without private text", async () => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  storedRows(
    ["id", "role", "parts"],
    [
      [
        INVALID_ROLE_ID,
        "narrator",
        JSON.stringify([{ type: "text", text: PRIVATE_ROLE_TEXT }]),
      ],
      [
        INVALID_PARTS_ID,
        "user",
        JSON.stringify([{ type: "text", body: PRIVATE_PARTS_TEXT }]),
      ],
      ["valid-message", "user", JSON.stringify([{ type: "text", text: "Hi" }])],
    ],
  );
  const log = spyOnErrorLog();

  expect(await listMessages(userIdFixture(), chatIdFixture())).toEqual([
    {
      id: "valid-message",
      role: "user",
      parts: [{ type: "text", text: "Hi" }],
    },
  ]);
  expect(log).toHaveBeenCalledTimes(2);
  for (const id of [INVALID_ROLE_ID, INVALID_PARTS_ID]) {
    expect(log).toHaveBeenCalledWith(
      "[app-error] unknown in listMessages",
      expect.stringContaining(id),
    );
  }
  const logged = JSON.stringify(log.mock.calls);
  expect(logged).not.toContain(PRIVATE_ROLE_TEXT);
  expect(logged).not.toContain(PRIVATE_PARTS_TEXT);
});
