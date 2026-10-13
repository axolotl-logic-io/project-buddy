// @vitest-environment node
import type { ToolSet } from "ai";
import { describe, expect, expectTypeOf, test } from "vitest";
import { DEFAULT_PERSONA_ID, getPersona } from "@/personas/index.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { tutorTools } from "@/tutor/tools/index.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";

const DEFAULT_TOOLS = tutorTools(getPersona(DEFAULT_PERSONA_ID).parts);

describe("tutorTools", () => {
  test("is a tool set the AI SDK accepts", () => {
    expectTypeOf(DEFAULT_TOOLS).toExtend<ToolSet>();
  });

  test("describes each tool as the pinned descriptions do, by default", () => {
    expect(
      Object.fromEntries(
        Object.entries(DEFAULT_TOOLS).map(([name, tool]) => [
          name,
          tool.description,
        ]),
      ),
    ).toMatchSnapshot();
  });

  test("describes each tool as the persona's parts say", () => {
    const tools = tutorTools({
      citeManualTool: "Cite it.",
      searchManualTool: "Search it.",
      updateMemoryTool: "Save it.",
    });

    expect(tools[CITE_MANUAL_TOOL].description).toBe("Cite it.");
    expect(tools[SEARCH_MANUAL_TOOL].description).toBe("Search it.");
    expect(tools[UPDATE_MEMORY_TOOL].description).toBe("Save it.");
    expect(tools[SEARCH_MANUAL_TOOL].inputSchema).toBe(
      DEFAULT_TOOLS[SEARCH_MANUAL_TOOL].inputSchema,
    );
  });

  test("marks only the last tool the provider gets as a cache breakpoint", () => {
    const tools = Object.values(DEFAULT_TOOLS);

    expect(tools.at(-1)?.providerOptions).toEqual(PROMPT_CACHE_BREAKPOINT);
    for (const tool of tools.slice(0, -1)) {
      expect(tool.providerOptions).toBeUndefined();
    }
  });
});
