import { describe, expect, test } from "vitest";
import {
  defaultMockScript,
  type MockConversation,
  type MockStep,
  type MockToolResult,
} from "@/tutor/mock-script.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";

const MARKDOWN_HEADING = /^## /mu;
const MARKDOWN_NUMBERED_ITEM = /^1\. /mu;
const MARKDOWN_BULLET = /^- /mu;
const MARKDOWN_TABLE_ROW = /^\| Ctrl\+B \| Bevel \|$/mu;
const MARKDOWN_MANUAL_LINK =
  /\[the manual\]\(https:\/\/docs\.blender\.org\/manual\/en\/latest\//u;
const BEVEL_URL =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage";
const NO_CONVERSATION: MockConversation = {
  systemTexts: [],
  earlierTexts: [],
  toolResults: [],
};
const SEARCH_STEP: MockStep = {
  text: "",
  toolCalls: [{ toolName: SEARCH_MANUAL_TOOL, input: { query: "bevel" } }],
};

function afterSearch(result: MockToolResult): readonly MockStep[] {
  return defaultMockScript("/mock-search bevel", {
    systemTexts: [],
    earlierTexts: [],
    toolResults: [result],
  });
}

function textOf(steps: readonly MockStep[]): string {
  return steps.map((step) => step.text).join("");
}

describe("defaultMockScript /mock-tool", () => {
  test("calls the named tool with the JSON object, then says so", () => {
    expect(
      defaultMockScript('/mock-tool echo {"word":"bevel"}', NO_CONVERSATION),
    ).toEqual([
      { text: "", toolCalls: [{ toolName: "echo", input: { word: "bevel" } }] },
      { text: "The mock tutor called `echo`.", toolCalls: [] },
    ]);
  });

  test("answers input that is not a JSON object with text alone", () => {
    for (const command of [
      "/mock-tool echo {word: bevel",
      '/mock-tool echo ["bevel"]',
      "/mock-tool echo",
    ]) {
      const steps = defaultMockScript(command, NO_CONVERSATION);

      expect(steps).toHaveLength(1);
      expect(steps[0]).toHaveProperty("toolCalls", []);
      expect(textOf(steps)).toContain("JSON object");
    }
  });
});

describe("defaultMockScript /mock-search", () => {
  test("searches the manual for the query first", () => {
    expect(defaultMockScript("/mock-search bevel", NO_CONVERSATION)).toEqual([
      SEARCH_STEP,
    ]);
  });

  test("then replies with each section found and cites them all", () => {
    const steps = afterSearch({
      toolName: SEARCH_MANUAL_TOOL,
      failed: false,
      output: {
        sections: [
          { title: "Usage", url: BEVEL_URL, excerpt: "Press Ctrl-B." },
        ],
      },
    });

    expect(steps).toEqual([
      SEARCH_STEP,
      {
        text: 'The manual covers "bevel":\n\n1. **Usage**: Press Ctrl-B.',
        toolCalls: [
          { toolName: CITE_MANUAL_TOOL, input: { urls: [BEVEL_URL] } },
        ],
      },
    ]);
  });

  test("says the manual has nothing, citing nothing, when nothing is found", () => {
    const [, reply] = afterSearch({
      toolName: SEARCH_MANUAL_TOOL,
      failed: false,
      output: { sections: [] },
    });

    expect(reply).toEqual({
      text: 'The manual has nothing on "bevel", so the mock tutor gives no steps.',
      toolCalls: [],
    });
  });

  test("says the search failed when it did", () => {
    const [, reply] = afterSearch({
      toolName: SEARCH_MANUAL_TOOL,
      failed: true,
      output: "The database is down",
    });

    expect(reply).toEqual({
      text: 'The mock tutor could not search the manual for "bevel".',
      toolCalls: [],
    });
  });
});

describe("defaultMockScript /mock-recall", () => {
  test("quotes each line of the prompt and earlier messages with the word", () => {
    const steps = defaultMockScript("/mock-recall Zebra", {
      systemTexts: ["Memory:\nThe zebra model needs stripes."],
      earlierTexts: [
        "Memory:\nThe zebra model needs stripes.",
        "My zebra has no tail.",
        "My zebra has no tail.",
        "Hello.",
      ],
      toolResults: [],
    });

    expect(textOf(steps)).toBe(
      'The mock tutor recalls "Zebra" in:\n\n- The zebra model needs stripes.\n- My zebra has no tail.',
    );
  });

  test("says when nothing mentions the word", () => {
    expect(
      textOf(defaultMockScript("/mock-recall zebra", NO_CONVERSATION)),
    ).toBe('The mock tutor recalls nothing about "zebra".');
  });
});

describe("defaultMockScript other messages", () => {
  test("/mock-markdown shows every kind of Markdown a reply uses", () => {
    const text = textOf(defaultMockScript("/mock-markdown", NO_CONVERSATION));

    expect(text).toMatch(MARKDOWN_HEADING);
    expect(text).toContain("*rounds*");
    expect(text).toContain("**Ctrl+B**");
    expect(text).toMatch(MARKDOWN_NUMBERED_ITEM);
    expect(text).toMatch(MARKDOWN_BULLET);
    expect(text).toMatch(MARKDOWN_TABLE_ROW);
    expect(text).toMatch(MARKDOWN_MANUAL_LINK);
    expect(text).toContain("```python\n");
  });

  test("names the commands it knows for an unknown one", () => {
    const text = textOf(defaultMockScript("/mock-dance", NO_CONVERSATION));

    expect(text).toContain("`/mock-dance`");
    expect(text).toContain("/mock-search");
  });

  test("quotes any other message in a Markdown reply", () => {
    expect(
      textOf(defaultMockScript("Hi **there**", NO_CONVERSATION)),
    ).toContain('You said: "Hi **there**".');
  });
});
