// What a project's memory is: a Markdown text that every chat in the project
// shares, saved as numbered versions. It imports nothing from the server, so
// pages, forms and tests can use it.
import { z } from "zod";
import type { UserId } from "@/ids.ts";

// Who wrote a version: the project's user, on the memory page, or the buddy.
const MEMORY_AUTHORS = ["user", "buddy"] as const;

// A version's number within its project, from 1 up; 0 is the empty memory
// before anything is saved.
const MEMORY_VERSION_NUMBER = z
  .number()
  .int()
  .nonnegative()
  .brand<"MemoryVersionNumber">();

type MemoryAuthor = (typeof MEMORY_AUTHORS)[number];

type MemoryVersionNumber = z.infer<typeof MEMORY_VERSION_NUMBER>;

// A project's memory as of one version.
interface Memory {
  readonly text: string;
  readonly version: MemoryVersionNumber;
}

// The person who saved a version: their id, and their name, or their email
// address when they have none, as the project's members see each other
// (docs/team-projects.md).
interface MemorySaver {
  readonly id: UserId;
  readonly name: string;
}

// A saved version, as the history lists it. A version the user wrote names
// the person who saved it, the acting user then, unless it was saved before
// savers were recorded or their account is gone.
interface MemoryVersion extends Memory {
  readonly author: MemoryAuthor;
  readonly createdAt: Date;
  readonly savedBy?: MemorySaver | undefined;
}

// The memory of a project with nothing saved yet.
const EMPTY_MEMORY: Memory = {
  text: "",
  version: MEMORY_VERSION_NUMBER.parse(0),
};

// Whether the memory holds nothing yet: no text, or only whitespace. While it
// is empty, the prompt and the memory page say so.
function isMemoryEmpty(memory: Memory): boolean {
  return memory.text.trim() === "";
}

export type {
  Memory,
  MemoryAuthor,
  MemorySaver,
  MemoryVersion,
  MemoryVersionNumber,
};
export { EMPTY_MEMORY, isMemoryEmpty, MEMORY_AUTHORS, MEMORY_VERSION_NUMBER };
