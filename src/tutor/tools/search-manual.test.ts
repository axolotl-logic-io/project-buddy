// @vitest-environment node
import { isStepCount, streamText } from "ai";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
} from "@/db/fake-neon-http.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { searchManualTool } from "@/tutor/tools/search-manual.ts";
import {
  SEARCH_MANUAL_OUTPUT,
  SEARCH_MANUAL_TOOL,
  type SearchManualOutput,
} from "@/tutor/tools/search-manual-contract.ts";

const BEVEL_URL =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage";
const BEVEL_PATH = "manual/modeling/meshes/editing/edge/bevel.rst";
const SEARCH_LIMIT = "5";
const EXCERPT_LIMIT = 1500;
const LONG_SECTION_WORDS = 600;

function answerWithSections(
  sections: readonly (readonly [title: string, text: string])[],
): FakeNeonHttp {
  const neonHttp = fakeNeonHttp({
    kind: "rows",
    columns: [
      { name: "title", type: "text" },
      { name: "url", type: "text" },
      { name: "anchor", type: "text" },
      { name: "file_path", type: "text" },
      { name: "text", type: "text" },
    ],
    rows: sections.map(([title, text]) => [
      title,
      BEVEL_URL,
      "usage",
      BEVEL_PATH,
      text,
    ]),
  });
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

type SearchOutcome =
  | { readonly output: SearchManualOutput }
  | { readonly error: unknown };

// Has the mock tutor call search_manual once with query, and returns the
// call's result or its error.
async function search(query: string): Promise<SearchOutcome> {
  const result = streamText({
    model: mockTutorModel(() => [
      {
        text: "",
        toolCalls: [{ toolName: SEARCH_MANUAL_TOOL, input: { query } }],
      },
    ]),
    messages: [{ role: "user", content: query }],
    tools: { [SEARCH_MANUAL_TOOL]: searchManualTool },
    stopWhen: isStepCount(1),
  });
  const [step] = await result.steps;
  const [outcome] =
    step?.content.flatMap((part): SearchOutcome[] => {
      if (part.type === "tool-result") {
        return [{ output: SEARCH_MANUAL_OUTPUT.parse(part.output) }];
      }
      if (part.type === "tool-error") {
        return [{ error: part.error }];
      }
      return [];
    }) ?? [];
  if (outcome === undefined) {
    throw new Error("The mock tutor's search returned nothing");
  }
  return outcome;
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("searchManualTool", () => {
  test("returns the best sections' titles, URLs and text, at most five", async () => {
    const neonHttp = answerWithSections([["Usage", "Press :kbd:`Ctrl-B`."]]);

    expect(await search("bevel edge")).toEqual({
      output: {
        sections: [
          { title: "Usage", url: BEVEL_URL, excerpt: "Press :kbd:`Ctrl-B`." },
        ],
      },
    });
    expect(neonHttp.queries[0]?.params).toEqual([
      "bevel edge",
      "bevel edge",
      SEARCH_LIMIT,
    ]);
  });

  test("cuts a long section's text at a word, marked with an ellipsis", async () => {
    const text = Array.from(
      { length: LONG_SECTION_WORDS },
      (_, index) => `word${index}`,
    ).join(" ");
    answerWithSections([["Long", text]]);

    const outcome = await search("long");

    expect(outcome).toHaveProperty("output");
    let excerpt = "";
    if ("output" in outcome) {
      excerpt = outcome.output.sections[0]?.excerpt ?? "";
    }
    const kept = excerpt.slice(0, -1);
    expect(excerpt.length).toBeLessThanOrEqual(EXCERPT_LIMIT);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(text.startsWith(`${kept} `)).toBe(true);
  });

  test("returns no sections when nothing matches", async () => {
    answerWithSections([]);

    expect(await search("hardops")).toEqual({ output: { sections: [] } });
  });

  test("fails the tool call, not the reply, when the search fails", async () => {
    spyOnErrorLog();
    vi.stubGlobal("fetch", fakeNeonHttp({ kind: "unreachable" }).fetch);

    expect(await search("bevel")).toHaveProperty("error");
  });
});
