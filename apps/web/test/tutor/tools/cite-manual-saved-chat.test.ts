// citeManualTool reading a saved chat's cite_manual output, which the chat's
// store doesn't check against the tool's schema. cite-manual.test.ts has the
// tool's other tests.
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, test } from "vitest";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { citeManualTool } from "@/tutor/tools/cite-manual.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";

const BEVEL_URL =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage";
const ANSWER = "Press Ctrl+B.";

// A saved chat whose earlier reply cited with output, then the user's next
// question.
function savedChatCiting(output: unknown): UIMessage[] {
  return [
    {
      id: "question",
      role: "user",
      parts: [{ type: "text", text: "What is a bevel?" }],
    },
    {
      id: "reply",
      role: "assistant",
      parts: [
        {
          type: `tool-${CITE_MANUAL_TOOL}`,
          toolCallId: "earlier-cite",
          state: "output-available",
          input: { urls: [BEVEL_URL] },
          output,
        },
        { type: "text", text: "A bevel rounds an edge." },
      ],
    },
    {
      id: "follow-up",
      role: "user",
      parts: [{ type: "text", text: "How do I add one?" }],
    },
  ];
}

describe("citeManualTool in a saved chat", () => {
  test("still replies when a saved output is malformed, reading no citations", async () => {
    const model = new MockLanguageModelV4({
      doStream: mockTutorModel(() => [{ text: ANSWER, toolCalls: [] }])
        .doStream,
    });

    const result = streamText({
      model,
      messages: await convertToModelMessages(savedChatCiting(null), {
        tools: { [CITE_MANUAL_TOOL]: citeManualTool },
      }),
    });

    expect(await result.text).toBe(ANSWER);
    expect(JSON.stringify(model.doStreamCalls[0]?.prompt)).toContain(
      '"citations":[]',
    );
  });
});
