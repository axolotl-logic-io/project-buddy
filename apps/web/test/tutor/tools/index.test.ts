// @vitest-environment node
import type { ToolSet } from "ai";
import { describe, expect, expectTypeOf, test } from "vitest";
import { DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { CREATE_PROJECT_TOOL } from "@/tutor/tools/create-project-contract.ts";
import {
  type TutorTools,
  type TutorToolsPlace,
  tutorTools,
} from "@/tutor/tools/index.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";

const DEFAULT_TOOLS = tutorTools("project", getBuddy(DEFAULT_BUDDY_ID).parts);

const DEFAULT_CENTRAL_TOOLS = tutorTools(
  "central",
  getBuddy(DEFAULT_BUDDY_ID).parts,
);

const PLACES: readonly TutorToolsPlace[] = ["project", "central"];

// Each tool's description, by name.
function descriptionsOf(tools: TutorTools): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [name, tool.description]),
  );
}

describe("tutorTools", () => {
  test("is a tool set the AI SDK accepts", () => {
    expectTypeOf(DEFAULT_TOOLS).toExtend<ToolSet>();
    expectTypeOf(DEFAULT_CENTRAL_TOOLS).toExtend<ToolSet>();
  });

  test("describes each tool as the pinned descriptions do, by default", () => {
    expect(descriptionsOf(DEFAULT_TOOLS)).toMatchSnapshot();
  });

  test("describes each tool in the central chat as the pinned descriptions do, by default", () => {
    expect(descriptionsOf(DEFAULT_CENTRAL_TOOLS)).toMatchSnapshot();
  });

  test("describes each tool as the buddy's parts say", () => {
    const tools = tutorTools("project", {
      citeManualTool: "Cite it.",
      searchManualTool: "Search it.",
      updateMemoryTool: "Save it.",
      createProjectTool: "Start it.",
    });
    const central = tutorTools("central", {
      citeManualTool: "Cite it.",
      searchManualTool: "Search it.",
      updateMemoryTool: "Save it.",
      createProjectTool: "Start it.",
    });

    expect(tools[CITE_MANUAL_TOOL].description).toBe("Cite it.");
    expect(tools[SEARCH_MANUAL_TOOL].description).toBe("Search it.");
    expect(tools).toHaveProperty(
      [UPDATE_MEMORY_TOOL, "description"],
      "Save it.",
    );
    expect(central).toHaveProperty(
      [CREATE_PROJECT_TOOL, "description"],
      "Start it.",
    );
    expect(tools[SEARCH_MANUAL_TOOL].inputSchema).toBe(
      DEFAULT_TOOLS[SEARCH_MANUAL_TOOL].inputSchema,
    );
  });
});

describe("the tools in each place", () => {
  test("offers the manual's tools and the memory's in a project chat", () => {
    expect(Object.keys(DEFAULT_TOOLS)).toEqual([
      CITE_MANUAL_TOOL,
      SEARCH_MANUAL_TOOL,
      UPDATE_MEMORY_TOOL,
    ]);
  });

  test("offers the manual's tools and create_project in the central chat", () => {
    expect(Object.keys(DEFAULT_CENTRAL_TOOLS)).toEqual([
      CITE_MANUAL_TOOL,
      SEARCH_MANUAL_TOOL,
      CREATE_PROJECT_TOOL,
    ]);
  });

  test.each(PLACES)(
    "marks only the last tool the provider gets as a cache breakpoint, in a %s chat",
    (place) => {
      const tools = Object.values(
        tutorTools(place, getBuddy(DEFAULT_BUDDY_ID).parts),
      );

      expect(tools.at(-1)?.providerOptions).toEqual(PROMPT_CACHE_BREAKPOINT);
      for (const tool of tools.slice(0, -1)) {
        expect(tool.providerOptions).toBeUndefined();
      }
    },
  );
});
