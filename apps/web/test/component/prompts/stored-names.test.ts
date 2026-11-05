// Constructs were first called buddies. Rows, saved drafts and links keep
// that first name where the build live during a release or after a rollback
// reads them, and every reader accepts both names.
import { expect, test } from "vitest";
import { STORED_MEMORY_AUTHOR, storedMemoryAuthor } from "@/memory/memory.ts";
import {
  PROMPT_KINDS,
  STORED_PROMPT_KIND,
  storedPromptKind,
} from "@/prompts/prompt.ts";

test("a construct is stored as kind buddy, and either name reads back as a construct", () => {
  expect(storedPromptKind("construct")).toBe("buddy");
  expect(STORED_PROMPT_KIND.parse("buddy")).toBe("construct");
  expect(STORED_PROMPT_KIND.parse("construct")).toBe("construct");
  for (const kind of PROMPT_KINDS) {
    expect(STORED_PROMPT_KIND.parse(storedPromptKind(kind))).toBe(kind);
  }
  expect(STORED_PROMPT_KIND.safeParse("guildmate").success).toBe(false);
});

test("a construct's memory version is stored by author buddy and reads back as a construct", () => {
  expect(storedMemoryAuthor("construct")).toBe("buddy");
  expect(storedMemoryAuthor("user")).toBe("user");
  expect(STORED_MEMORY_AUTHOR.parse("buddy")).toBe("construct");
  expect(STORED_MEMORY_AUTHOR.parse("user")).toBe("user");
  expect(STORED_MEMORY_AUTHOR.safeParse("construct").success).toBe(false);
});
