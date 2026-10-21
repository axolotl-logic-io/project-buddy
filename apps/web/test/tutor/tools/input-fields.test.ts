import { describe, expect, test } from "vitest";
import { TOOL_INPUT_FIELDS } from "@/tutor/tools/input-fields.ts";

describe("the tools' input fields", () => {
  test("name each tool's fields with the descriptions they send", () => {
    expect(
      TOOL_INPUT_FIELDS.map(({ tool, fields }) => ({
        tool,
        fields: fields.map(({ name }) => name),
      })),
    ).toEqual([
      { tool: "search_manual", fields: ["query"] },
      { tool: "cite_manual", fields: ["urls"] },
      { tool: "update_memory", fields: ["oldText", "newText"] },
      { tool: "create_project", fields: ["name"] },
    ]);
    for (const { fields } of TOOL_INPUT_FIELDS) {
      for (const { description } of fields) {
        expect(description).not.toBe("");
      }
    }
  });
});
