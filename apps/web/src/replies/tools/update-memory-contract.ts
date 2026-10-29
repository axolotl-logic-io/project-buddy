// What the update_memory tool takes and returns, shared by the tool and the
// part that shows each change in the chat. It imports nothing from the server,
// because the part in the browser imports it too.
import { z } from "zod";
import { MEMORY_EDIT_FAILURES } from "@/memory/memory-edit.ts";

const UPDATE_MEMORY_TOOL = "update_memory";

// The updateMemoryTool part's default: the tool's description.
const UPDATE_MEMORY_DESCRIPTION = [
  "Change the project's memory: the Markdown document, shown in your instructions, that every chat in this project shares and reads.",
  "Keep it current: record the user's goals, milestones, progress and preferences when they report progress, change a goal or state a preference.",
  "Each call replaces oldText with newText and saves a new version, which the user sees in the chat and can undo.",
  "If oldText is not in the memory exactly once, for example because the user changed the memory meanwhile, nothing is saved and the result gives the memory as it is now.",
].join(" ");

// One edit to the memory, the shape of a MemoryEdit.
const UPDATE_MEMORY_INPUT = z.object({
  oldText: z
    .string()
    .describe(
      "Text copied exactly from the memory, which occurs in it once, to replace. Empty to add newText at the end.",
    ),
  newText: z
    .string()
    .describe("The text to put in its place. Empty to delete oldText."),
});

// The change the tool saved as a new version of the project's memory, or why
// it saved nothing: the text to replace was missing or not unique, or the
// edit changed nothing. Then `memory` is the memory as it is, so the buddy
// can try again.
const UPDATE_MEMORY_OUTPUT = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("updated"),
    version: z.number().int().positive(),
    oldText: z.string(),
    newText: z.string(),
  }),
  z.object({
    status: z.literal("not-applied"),
    reason: z.enum(MEMORY_EDIT_FAILURES),
    memory: z.string(),
  }),
]);

type UpdateMemoryOutput = z.infer<typeof UPDATE_MEMORY_OUTPUT>;

export type { UpdateMemoryOutput };
export {
  UPDATE_MEMORY_DESCRIPTION,
  UPDATE_MEMORY_INPUT,
  UPDATE_MEMORY_OUTPUT,
  UPDATE_MEMORY_TOOL,
};
