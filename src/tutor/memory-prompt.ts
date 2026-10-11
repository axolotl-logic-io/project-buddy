// The prompt section that gives every chat in a project the project's memory,
// as it is when the reply starts.
import { readMemory } from "@/memory/memory-store.ts";
import type { TutorPromptContext } from "@/tutor/system-prompt.ts";

const EMPTY_MEMORY_PROMPT =
  "The project's memory is empty: nothing about the user's goals, milestones, progress or preferences is saved yet.";

const MEMORY_PROMPT_INTRO =
  "The project's memory, which every chat in this project shares and works from. It holds the user's goals, milestones, progress and preferences:";

// The project's memory, between tags that keep it apart from the rest of the
// prompt.
async function memoryPromptSection({
  chat,
}: TutorPromptContext): Promise<string> {
  const { text } = await readMemory(chat.projectId);
  if (text.trim() === "") {
    return EMPTY_MEMORY_PROMPT;
  }
  return [
    MEMORY_PROMPT_INTRO,
    "<project_memory>",
    text,
    "</project_memory>",
  ].join("\n");
}

export { memoryPromptSection };
