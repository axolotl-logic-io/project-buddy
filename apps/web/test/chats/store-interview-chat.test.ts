// @vitest-environment node
// A chat knows whether it is its project's interview chat
// (projects.interview_chat_id), the only chat whose prompt holds the
// interview.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getChat } from "@/chats/store.ts";
import { FAKE_DATABASE_URL } from "../db/fake-neon-http.ts";
import {
  chatIdFixture,
  projectIdFixture,
  userIdFixture,
} from "../id-fixtures.ts";
import { CHAT_COLUMNS, storedRows } from "./stored-rows.ts";

const OWNER = userIdFixture();
const CHAT_ID = chatIdFixture();
const PROJECT_ID = projectIdFixture();
const CREATED_AT = "2026-10-11 09:00:00+00";

// The chat, joined with its project's name and interview chat, as getChat
// reads it.
function storedChat(interviewChatId: string | null): void {
  storedRows(
    [...CHAT_COLUMNS, "project_name", "project_interview_chat_id"],
    [
      [
        CHAT_ID,
        PROJECT_ID,
        "mr-tee",
        null,
        null,
        null,
        "f",
        CREATED_AT,
        "Fox",
        interviewChatId,
      ],
    ],
  );
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("chat store getChat, for the project's interview chat", () => {
  test.each([
    ["is", CHAT_ID, true],
    ["is not, when the project's is another", chatIdFixture(), false],
    ["is not, when the project has none", null, false],
  ])(
    "tells that the chat %s the interview chat",
    async (_is, interviewChatId, isInterviewChat) => {
      storedChat(interviewChatId);

      expect(await getChat(OWNER, CHAT_ID)).toHaveProperty(
        "isInterviewChat",
        isInterviewChat,
      );
    },
  );
});
