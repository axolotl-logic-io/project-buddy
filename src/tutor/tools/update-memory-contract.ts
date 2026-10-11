// The update_memory tool's name and output, shared by the tool and the part
// that shows each change in the chat. It imports nothing from the server,
// because the part in the browser imports it too.
import { z } from "zod";
import { MEMORY_EDIT_FAILURES } from "@/memory/memory-edit.ts";

const UPDATE_MEMORY_TOOL = "update_memory";

// The change the tool saved as a new version of the project's memory, or why
// it saved nothing: the text to replace was missing or not unique, or the
// edit changed nothing. Then `memory` is the memory as it is, so the tutor
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
export { UPDATE_MEMORY_OUTPUT, UPDATE_MEMORY_TOOL };
