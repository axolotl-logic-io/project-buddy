// The prompt section that gives every chat in a project the project's memory,
// as the prompt read it when the turn started. Its lines are the persona's
// memory parts, whose defaults are here; the tags are locked, so the mock
// tutor can always find the memory.
import { isMemoryEmpty } from "@/memory/memory.ts";
import type { TutorPromptContext } from "@/tutor/system-prompt.ts";

// The emptyMemory part's default.
const EMPTY_MEMORY_PROMPT =
  "The project's memory is empty: nothing about the user's goals, milestones, progress or preferences is saved yet.";

// The memoryIntro part's default.
const MEMORY_PROMPT_INTRO =
  "The project's memory, which every chat in this project shares and works from. It holds the user's goals, milestones, progress and preferences:";

const MEMORY_START_TAG = "<project_memory>";
const MEMORY_END_TAG = "</project_memory>";

// The project's memory, between tags that keep it apart from the rest of the
// prompt.
function memoryPromptSection({ memory, persona }: TutorPromptContext): string {
  if (isMemoryEmpty(memory)) {
    return persona.parts.emptyMemory;
  }
  return [
    persona.parts.memoryIntro,
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

export {
  EMPTY_MEMORY_PROMPT,
  MEMORY_PROMPT_INTRO,
  memoryInPrompt,
  memoryPromptSection,
};
