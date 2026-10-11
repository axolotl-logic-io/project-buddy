import { streamText } from "ai";
import { describe, expect, test } from "vitest";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { mockSystemPromptReply } from "@/tutor/mock-system-prompt.ts";

const SHARED = "You are a Blender tutor.";
const MEMORY = "<project_memory>\n# Goals\n\n```\ncode\n```\n</project_memory>";

describe("mockSystemPromptReply", () => {
  test("replies with every system message, fenced so it shows as written", () => {
    expect(
      mockSystemPromptReply("", {
        systemTexts: [SHARED, MEMORY],
        earlierTexts: [SHARED, MEMORY, "An earlier message."],
        toolResults: [],
      }),
    ).toEqual([
      {
        text: `~~~~~~~~text\n${SHARED}\n\n${MEMORY}\n~~~~~~~~`,
        toolCalls: [],
      },
    ]);
  });

  test("answers the command in the mock tutor model", async () => {
    const result = streamText({
      model: mockTutorModel(),
      instructions: [
        { role: "system", content: SHARED },
        { role: "system", content: MEMORY },
      ],
      messages: [
        { role: "user", content: "Hello." },
        { role: "assistant", content: "Hi." },
        { role: "user", content: " /mock-system-prompt\n" },
      ],
    });

    const text = await result.text;

    expect(text).toContain(MEMORY);
    expect(text).not.toContain("Hello.");
  });
});
