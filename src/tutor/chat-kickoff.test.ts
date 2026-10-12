import type { ModelMessage } from "ai";
import { describe, expect, test } from "vitest";
import { isChatKickoff, withChatKickoff } from "@/tutor/chat-kickoff.ts";

const OPENING: ModelMessage = {
  role: "assistant",
  content: [{ type: "text", text: "What would you like to make?" }],
};

const ANSWER: ModelMessage = {
  role: "user",
  content: [{ type: "text", text: "A fox for my game." }],
};

describe("withChatKickoff", () => {
  test("puts a message from the user before the tutor's opening", () => {
    const [kickoff, ...rest] = withChatKickoff([OPENING, ANSWER]);

    expect(kickoff?.role).toBe("user");
    expect(kickoff?.content).not.toBe("");
    expect(rest).toEqual([OPENING, ANSWER]);
  });

  test("is the whole conversation when there is none yet", () => {
    const [kickoff, ...rest] = withChatKickoff([]);

    expect(kickoff?.role).toBe("user");
    expect(rest).toEqual([]);
  });

  test("leaves a conversation that starts with the user alone", () => {
    expect(withChatKickoff([ANSWER, OPENING])).toEqual([ANSWER, OPENING]);
  });

  test("is the same kickoff every time", () => {
    const [first] = withChatKickoff([]);
    const [second] = withChatKickoff([OPENING]);

    expect(first).toEqual(second);
  });
});

describe("isChatKickoff", () => {
  test("knows the kickoff's text and nothing else", () => {
    const [kickoff] = withChatKickoff([]);

    expect(isChatKickoff(String(kickoff?.content))).toBe(true);
    expect(isChatKickoff("A fox for my game.")).toBe(false);
    expect(isChatKickoff("")).toBe(false);
  });
});
