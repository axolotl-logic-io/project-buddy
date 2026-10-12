import { describe, expect, test } from "vitest";
import { NEUTRAL_KICKOFF } from "@/tutor/chat-kickoff.ts";
import { mockChatNameScript } from "@/tutor/mock-chat-name.ts";

describe("mockChatNameScript", () => {
  test("names the chat after its first message and how many messages it has", () => {
    expect(
      mockChatNameScript("Name this chat.", {
        systemTexts: ["You name chats."],
        earlierTexts: ["Bevel a donut\nwith sprinkles", "Press Ctrl+B."],
        toolResults: [],
        answerNow: false,
      }),
    ).toEqual([{ text: "Bevel a donut (2 messages)", toolCalls: [] }]);
  });

  test("in a chat that opens with the tutor's opening, names it after her first message, without counting the neutral kickoff", () => {
    expect(
      mockChatNameScript("Name this chat.", {
        systemTexts: ["You name chats."],
        earlierTexts: [
          NEUTRAL_KICKOFF,
          "What would you like to make in Blender?",
          "Bevel a donut",
          "Press Ctrl+B.",
        ],
        toolResults: [],
        answerNow: false,
      }),
    ).toEqual([{ text: "Bevel a donut (3 messages)", toolCalls: [] }]);
  });

  test("quotes no more than the first 30 characters of the first message", () => {
    const [step] = mockChatNameScript("Name this chat.", {
      systemTexts: [],
      earlierTexts: ["How do I model a low-poly fox for a game?"],
      toolResults: [],
      answerNow: false,
    });

    expect(step?.text).toBe("How do I model a low-poly fox (1 message)");
  });
});
