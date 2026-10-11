import { streamText } from "ai";
import { describe, expect, test } from "vitest";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { mockSystemPromptStep } from "@/tutor/mock-system-prompt.ts";

const SHARED = "You are a Blender tutor.";
const MEMORY = "<project_memory>\n# Goals\n\n```\ncode\n```\n</project_memory>";

describe("mockSystemPromptStep", () => {
  test("replies with every system message, fenced so it shows as written", () => {
    expect(
      mockSystemPromptStep([
        { role: "system", content: SHARED },
        { role: "system", content: MEMORY },
        {
          role: "user",
          content: [{ type: "text", text: " /mock-system-prompt\n" }],
        },
      ]),
    ).toEqual({
      text: `~~~~~~~~text\n${SHARED}\n\n${MEMORY}\n~~~~~~~~`,
      toolCalls: [],
    });
  });

  test("leaves any other message to the script", () => {
    expect(
      mockSystemPromptStep([
        { role: "system", content: SHARED },
        {
          role: "user",
          content: [{ type: "text", text: "/mock-system-prompt please" }],
        },
      ]),
    ).toBeUndefined();
  });

  test("answers the command in the mock tutor model", async () => {
    const result = streamText({
      model: mockTutorModel(),
      instructions: [
        { role: "system", content: SHARED },
        { role: "system", content: MEMORY },
      ],
      messages: [{ role: "user", content: "/mock-system-prompt" }],
    });

    await expect(result.text).resolves.toContain(MEMORY);
  });
});
