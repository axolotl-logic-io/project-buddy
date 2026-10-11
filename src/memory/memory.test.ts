import { describe, expect, test } from "vitest";
import {
  EMPTY_MEMORY,
  isMemoryEmpty,
  MEMORY_VERSION_NUMBER,
  type Memory,
} from "@/memory/memory.ts";

function savedMemory(text: string): Memory {
  return { text, version: MEMORY_VERSION_NUMBER.parse(1) };
}

describe("isMemoryEmpty", () => {
  test("is true for a project with nothing saved", () => {
    expect(isMemoryEmpty(EMPTY_MEMORY)).toBe(true);
  });

  test("is true for a saved empty text", () => {
    expect(isMemoryEmpty(savedMemory(""))).toBe(true);
  });

  test("is true for a text of only whitespace", () => {
    expect(isMemoryEmpty(savedMemory(" \n\t\n"))).toBe(true);
  });

  test("is false for a text with something in it", () => {
    expect(isMemoryEmpty(savedMemory("\n# Goals\n"))).toBe(false);
  });
});
