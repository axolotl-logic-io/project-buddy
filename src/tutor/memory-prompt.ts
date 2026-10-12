// The prompt section that gives every chat in a project the project's memory,
// as the prompt read it when the turn started.
import { isMemoryEmpty } from "@/memory/memory.ts";
import type { TutorPromptContext } from "@/tutor/system-prompt.ts";

const EMPTY_MEMORY_PROMPT =
  "The project's memory is empty: nothing about the user's goals, milestones, progress or preferences is saved yet.";

const MEMORY_PROMPT_INTRO =
  "The project's memory, which every chat in this project shares and works from. It holds the user's goals, milestones, progress and preferences:";

const MEMORY_START_TAG = "<project_memory>";
const MEMORY_END_TAG = "</project_memory>";

// The project's memory, between tags that keep it apart from the rest of the
// prompt.
function memoryPromptSection({ memory }: TutorPromptContext): string {
  if (isMemoryEmpty(memory)) {
    return EMPTY_MEMORY_PROMPT;
  }
  return [
    MEMORY_PROMPT_INTRO,
    MEMORY_START_TAG,
    memory.text,
    MEMORY_END_TAG,
  ].join("\n");
}

// The memory text that a prompt holding this section gives, or "" if the
// memory is empty or the prompt has none. The mock tutor reads the memory
// this way, as Claude reads it.
function memoryInPrompt(prompt: string): string {
  const start = prompt.indexOf(MEMORY_START_TAG);
  const end = prompt.lastIndexOf(MEMORY_END_TAG);
  if (start === -1 || end < start) {
    return "";
  }
  return prompt.slice(start + MEMORY_START_TAG.length, end).trim();
}

export { memoryInPrompt, memoryPromptSection };
