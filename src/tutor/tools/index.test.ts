// @vitest-environment node
import type { ToolSet } from "ai";
import { describe, expectTypeOf, test } from "vitest";
import { TUTOR_TOOLS } from "@/tutor/tools/index.ts";

describe("TUTOR_TOOLS", () => {
  test("is a tool set the AI SDK accepts", () => {
    expectTypeOf(TUTOR_TOOLS).toExtend<ToolSet>();
  });
});
