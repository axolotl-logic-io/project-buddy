import { describe, expect, test } from "vitest";
import {
  defaultMockScript,
  MOCK_COMMANDS,
  type MockConversation,
  type MockStep,
  type MockToolResult,
} from "@/tutor/mock-script.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";

const SEARCH_AND_CITE_STEPS = 3;

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
  answerNow: false,
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
    answerNow: false,
  });
}

function textOf(steps: readonly MockStep[]): string {
  return steps.map((step) => step.text).join("");
}

describe("defaultMockScript /mock-tool", () => {
  test("calls the named tool with the JSON object, then says so", () => {
    const steps = defaultMockScript(
      '/mock-tool echo {"word":"bevel"}',
      NO_CONVERSATION,
    );
    expect(steps).toHaveLength(2);
    expect(steps[0]).toEqual({
      text: "",
      toolCalls: [{ toolName: "echo", input: { word: "bevel" } }],
    });
    expect(steps[1]).toHaveProperty("toolCalls", []);
    expect(steps[1]?.text).toContain("echo");
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

  test("then cites every section found, then replies with each one", () => {
    const steps = afterSearch({
      toolName: SEARCH_MANUAL_TOOL,
      failed: false,
      output: {
        sections: [
          { label: "Bevel › Usage", url: BEVEL_URL, excerpt: "Press Ctrl-B." },
        ],
      },
    });
    expect(steps).toHaveLength(SEARCH_AND_CITE_STEPS);
    expect(steps.slice(0, 2)).toEqual([
      SEARCH_STEP,
      {
        text: "",
        toolCalls: [
          { toolName: CITE_MANUAL_TOOL, input: { urls: [BEVEL_URL] } },
        ],
      },
    ]);
    expect(steps[2]).toHaveProperty("toolCalls", []);
    for (const content of ["bevel", "Bevel › Usage", "Press Ctrl-B."]) {
      expect(steps[2]?.text).toContain(content);
    }
  });

  test("says the manual has nothing, citing nothing, when nothing is found", () => {
    const steps = afterSearch({
      toolName: SEARCH_MANUAL_TOOL,
      failed: false,
      output: { sections: [] },
    });
    expect(steps).toHaveLength(2);
    expect(steps[0]).toEqual(SEARCH_STEP);
    expect(steps[1]).toHaveProperty("toolCalls", []);
    expect(steps[1]?.text).toContain("bevel");
    expect(steps[1]?.text).not.toContain("Press Ctrl-B");
  });

  test("says the search failed when it did", () => {
    const steps = afterSearch({
      toolName: SEARCH_MANUAL_TOOL,
      failed: true,
      output: "The database is down",
    });
    expect(steps).toHaveLength(2);
    expect(steps[0]).toEqual(SEARCH_STEP);
    expect(steps[1]).toHaveProperty("toolCalls", []);
    expect(steps[1]?.text).toContain("bevel");
    expect(steps[1]?.text).not.toContain("Press Ctrl-B");
  });
});

describe("defaultMockScript /mock-recall", () => {
  test("quotes each line of the prompt and earlier messages with the word", () => {
    const steps = defaultMockScript("/mock-recall Zebra", {
      systemTexts: ["Memory:\nThe zebra model needs stripes."],
      earlierTexts: [
        "The zebra model needs stripes.",
        "My zebra has no tail.",
        "My zebra has no tail.",
        "Hello.",
      ],
      toolResults: [],
      answerNow: false,
    });
    const text = textOf(steps);
    expect(text).toContain("Zebra");
    expect(text.split("The zebra model needs stripes.")).toHaveLength(2);
    expect(text.split("My zebra has no tail.")).toHaveLength(2);
    expect(text).not.toContain("Hello.");
  });

  test("says when nothing mentions the word", () => {
    const steps = defaultMockScript("/mock-recall zebra", NO_CONVERSATION);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toHaveProperty("toolCalls", []);
    expect(textOf(steps)).toContain("zebra");
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

  test("lists how to use each command it knows for an unknown one", () => {
    const text = textOf(defaultMockScript("/mock-dance", NO_CONVERSATION));
    expect(text).toContain("/mock-dance");
    for (const { name } of MOCK_COMMANDS) {
      expect(text).toContain(`/mock-${name}`);
    }
  });

  test("quotes any other message in a Markdown reply", () => {
    expect(
      textOf(defaultMockScript("Hi **there**", NO_CONVERSATION)),
    ).toContain('You said: "Hi **there**".');
  });
});
