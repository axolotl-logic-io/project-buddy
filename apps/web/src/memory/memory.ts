// What a project's memory is: a Markdown text that every chat in the project
// shares, saved as numbered versions. It imports nothing from the server, so
// pages, forms and tests can use it.
import { z } from "zod";

// Who wrote a version: the project's user, on the memory page, or the construct.
const MEMORY_AUTHORS = ["user", "construct"] as const;

// How each author is stored. A construct's versions keep the first name,
// "buddy", so the build that is live during a release or after a rollback
// still reads and writes them (docs/project-practices.md#site-data).
const STORED_MEMORY_AUTHORS = ["user", "buddy"] as const;

// A stored author parsed to its author.
const STORED_MEMORY_AUTHOR = z
  .enum(STORED_MEMORY_AUTHORS)
  .transform((stored): MemoryAuthor => {
    if (stored === "buddy") {
      return "construct";
    }
    return stored;
  });

// A version's number within its project, from 1 up; 0 is the empty memory
// before anything is saved.
const MEMORY_VERSION_NUMBER = z
  .number()
  .int()
  .nonnegative()
  .brand<"MemoryVersionNumber">();

type MemoryAuthor = (typeof MEMORY_AUTHORS)[number];

type StoredMemoryAuthor = (typeof STORED_MEMORY_AUTHORS)[number];

function storedMemoryAuthor(author: MemoryAuthor): StoredMemoryAuthor {
  if (author === "construct") {
    return "buddy";
  }
  return author;
}

type MemoryVersionNumber = z.infer<typeof MEMORY_VERSION_NUMBER>;

// A project's memory as of one version.
interface Memory {
  readonly text: string;
  readonly version: MemoryVersionNumber;
}

// The person who saved a version, as the history names them to the user
// viewing it: that user, or, for a version saved while quests could be
// shared, someone else by their name, or by their email address when they
// have no name.
type MemorySaver =
  | { readonly kind: "viewer" }
  | { readonly kind: "person"; readonly name: string };

// A saved version, as the history lists it. savedBy is undefined on the
// construct's versions, and on a person's version saved before savers were
// recorded or whose account is gone.
interface MemoryVersion extends Memory {
  readonly restoredFromVersion?: MemoryVersionNumber | undefined;
  readonly author: MemoryAuthor;
  readonly savedBy: MemorySaver | undefined;
  readonly createdAt: Date;
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
export {
  EMPTY_MEMORY,
  isMemoryEmpty,
  MEMORY_AUTHORS,
  MEMORY_VERSION_NUMBER,
  STORED_MEMORY_AUTHOR,
  STORED_MEMORY_AUTHORS,
  storedMemoryAuthor,
};
