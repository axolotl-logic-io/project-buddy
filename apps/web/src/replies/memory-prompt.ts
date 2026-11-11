// The prompt section that gives every chat in a project the project's memory,
// as the prompt read it when the turn started, between tags, so the mock
// construct can always find the memory.
import { isMemoryEmpty } from "@/memory/memory.ts";
import type { ReplyPromptContext } from "@/replies/system-prompt.ts";

// The line the prompt gives while the memory is empty.
const EMPTY_MEMORY_PROMPT =
  "The quest's free Journal notes are empty. Goal, Preferences and Plan are separate sections.";

// The line before the memory.
const MEMORY_PROMPT_INTRO =
  "The quest's free Journal notes, which every reply in this quest's conversation reads. Legacy headings are preserved here; current typed Goal, Preferences and Plan take precedence:";

// The tags around the memory.
const MEMORY_START_TAG = "<project_memory>";
const MEMORY_END_TAG = "</project_memory>";

// The project's memory, between tags that keep it apart from the rest of the
// prompt, or "" in a standalone chat, which has no project and so no
// memory.
function memoryPromptSection({ project }: ReplyPromptContext): string {
  if (project === undefined) {
    return "";
  }
  if (isMemoryEmpty(project.memory)) {
    return EMPTY_MEMORY_PROMPT;
  }
  return [
    MEMORY_PROMPT_INTRO,
    MEMORY_START_TAG,
    project.memory.text,
    MEMORY_END_TAG,
  ].join("\n");
}

// The memory text that a prompt holding this section gives, or "" if the
// memory is empty or the prompt has none. The mock construct reads the memory
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
  MEMORY_END_TAG,
  MEMORY_PROMPT_INTRO,
  MEMORY_START_TAG,
  memoryInPrompt,
  memoryPromptSection,
};
