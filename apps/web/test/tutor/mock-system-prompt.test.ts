import { streamText } from "ai";
import { describe, expect, test } from "vitest";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { mockSystemPromptReply } from "@/tutor/mock-system-prompt.ts";

const CODE_FENCE_WIDTH = 3;
const PROMPT_FENCE = /^(?<fence>~+)text\n/u;

const SHARED = "You are a Blender tutor.";
const MEMORY = "<project_memory>\n# Goals\n\n```\ncode\n```\n</project_memory>";

describe("mockSystemPromptReply", () => {
  test("replies with every system message, fenced so it shows as written", () => {
    const steps = mockSystemPromptReply("", {
      systemTexts: [SHARED, MEMORY],
      earlierTexts: [SHARED, MEMORY, "An earlier message."],
      toolResults: [],
      answerNow: false,
    });
    expect(steps).toHaveLength(1);
    expect(steps[0]).toHaveProperty("toolCalls", []);
    const text = steps[0]?.text ?? "";
    expect(text).toContain(SHARED);
    expect(text).toContain(MEMORY);
    const { fence = "" } = PROMPT_FENCE.exec(text)?.groups ?? {};
    expect(fence.length).toBeGreaterThan(CODE_FENCE_WIDTH);
    expect(text.endsWith(`\n${fence}`)).toBe(true);
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
