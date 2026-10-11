// @vitest-environment node
import { isStepCount, type ModelMessage, streamText } from "ai";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { FAKE_DATABASE_URL, fakeNeonHttp } from "@/db/fake-neon-http.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import type { MockToolCall } from "@/tutor/mock-script.ts";
import { citeManualTool } from "@/tutor/tools/cite-manual.ts";
import {
  CITE_MANUAL_OUTPUT,
  CITE_MANUAL_TOOL,
  type CiteManualOutput,
} from "@/tutor/tools/cite-manual-contract.ts";
import { searchManualTool } from "@/tutor/tools/search-manual.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";

const BEVEL_URL =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage";
const EXTRUDE_URL =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/face/extrude_faces.html#extrude-faces";
const INVENTED_URL =
  "https://docs.blender.org/manual/en/latest/modeling/invented.html#invented";
const CITING_STEPS = 3;

function searchFinds(sections: readonly (readonly [string, string])[]): void {
  vi.stubGlobal(
    "fetch",
    fakeNeonHttp({
      kind: "rows",
      columns: [
        { name: "title", type: "text" },
        { name: "url", type: "text" },
        { name: "anchor", type: "text" },
        { name: "file_path", type: "text" },
        { name: "text", type: "text" },
      ],
      rows: sections.map(([title, url]) => [
        title,
        url,
        "a",
        "manual/a.rst",
        "Text.",
      ]),
    }).fetch,
  );
}

// Plays the mock tutor's steps: each step makes one tool call, after the
// conversation `earlier`. Returns what cite_manual answered.
async function cite(
  calls: readonly MockToolCall[],
  earlier: readonly ModelMessage[] = [],
): Promise<CiteManualOutput> {
  const result = streamText({
    model: mockTutorModel(() =>
      calls.map((call) => ({ text: "", toolCalls: [call] })),
    ),
    messages: [...earlier, { role: "user", content: "How do I bevel?" }],
    tools: {
      [CITE_MANUAL_TOOL]: citeManualTool,
      [SEARCH_MANUAL_TOOL]: searchManualTool,
    },
    stopWhen: isStepCount(CITING_STEPS),
  });
  const steps = await result.steps;
  const citation = steps
    .flatMap((step) => step.toolResults)
    .find((toolResult) => toolResult.toolName === CITE_MANUAL_TOOL);
  return CITE_MANUAL_OUTPUT.parse(citation?.output);
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("citeManualTool", () => {
  test("cites the sections a search returned, with their titles, in the order named", async () => {
    searchFinds([
      ["Usage", BEVEL_URL],
      ["Extrude Faces", EXTRUDE_URL],
    ]);

    const output = await cite([
      { toolName: SEARCH_MANUAL_TOOL, input: { query: "bevel" } },
      {
        toolName: CITE_MANUAL_TOOL,
        input: { urls: [EXTRUDE_URL, BEVEL_URL, EXTRUDE_URL] },
      },
    ]);

    expect(output).toEqual({
      citations: [
        { title: "Extrude Faces", url: EXTRUDE_URL },
        { title: "Usage", url: BEVEL_URL },
      ],
    });
  });

  test("drops sections no search returned", async () => {
    searchFinds([["Usage", BEVEL_URL]]);

    const output = await cite([
      { toolName: SEARCH_MANUAL_TOOL, input: { query: "bevel" } },
      {
        toolName: CITE_MANUAL_TOOL,
        input: { urls: [INVENTED_URL, BEVEL_URL] },
      },
    ]);

    expect(output).toEqual({ citations: [{ title: "Usage", url: BEVEL_URL }] });
  });

  test("cites nothing without a search", async () => {
    const output = await cite([
      { toolName: CITE_MANUAL_TOOL, input: { urls: [BEVEL_URL] } },
    ]);

    expect(output).toEqual({ citations: [] });
  });
});

describe("citeManualTool across turns", () => {
  test("cites a section a search returned earlier in the chat", async () => {
    const earlier: ModelMessage[] = [
      { role: "user", content: "What is a bevel?" },
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "earlier-search",
            toolName: SEARCH_MANUAL_TOOL,
            input: { query: "bevel" },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "earlier-search",
            toolName: SEARCH_MANUAL_TOOL,
            output: {
              type: "json",
              value: {
                sections: [
                  { title: "Usage", url: BEVEL_URL, excerpt: "Text." },
                ],
              },
            },
          },
        ],
      },
    ];

    const output = await cite(
      [{ toolName: CITE_MANUAL_TOOL, input: { urls: [BEVEL_URL] } }],
      earlier,
    );

    expect(output).toEqual({ citations: [{ title: "Usage", url: BEVEL_URL }] });
  });
});
