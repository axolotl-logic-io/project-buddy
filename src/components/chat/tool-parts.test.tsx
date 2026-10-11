import { describe, expect, test } from "vitest";
import { TOOL_PARTS } from "@/components/chat/tool-parts.tsx";
import { TUTOR_TOOLS } from "@/tutor/tools/index.ts";

describe("TOOL_PARTS", () => {
  test("has a part for every tool the tutor may call", () => {
    const toolsWithoutPart = Object.keys(TUTOR_TOOLS).filter(
      (toolName) => !TOOL_PARTS.has(toolName),
    );

    expect(toolsWithoutPart).toEqual([]);
  });
});
