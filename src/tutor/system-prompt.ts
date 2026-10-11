// The tutor's system prompt, assembled from two lists of sections. Add a
// section by adding one entry to a list:
// - SHARED_SECTIONS hold text that is the same in every chat, such as the
//   tutor's role and rules. They are cached across chats, so they must not
//   depend on the chat.
// - CHAT_SECTIONS render text for one chat, such as its project and persona.
//   A section that renders "" is left out.
import type { SystemModelMessage } from "ai";
import type { ChatWithProject } from "@/chats/store.ts";
import type { Memory } from "@/memory/memory.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { type Persona, renderPersonaPrompt } from "@/personas/index.ts";
import { CITATION_RULES } from "@/tutor/citation-prompt.ts";
import { interviewPromptSection } from "@/tutor/interview-prompt.ts";
import { memoryPromptSection } from "@/tutor/memory-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";

// The chat turn a prompt is for.
interface TutorPromptRequest {
  readonly chat: ChatWithProject;
  readonly persona: Persona;
}

// What a chat section may read: the turn, and the project's memory as it was
// read once for the whole prompt, so every section sees the same version.
interface TutorPromptContext extends TutorPromptRequest {
  readonly memory: Memory;
}

// A section of one chat's prompt, rendered from the context alone.
type ChatPromptSection = (context: TutorPromptContext) => string;

const SECTION_SEPARATOR = "\n\n";

const SHARED_SECTIONS: readonly string[] = [
  "You are a Blender tutor. You teach the user Blender through their own projects.",
  CITATION_RULES,
];

const CHAT_SECTIONS: readonly ChatPromptSection[] = [
  ({ chat }: TutorPromptContext): string =>
    `This chat is about the user's project "${chat.projectName}".`,
  memoryPromptSection,
  interviewPromptSection,
  ({ persona }: TutorPromptContext): string => renderPersonaPrompt(persona),
];

// The system messages for one chat turn: the shared sections, marked as a
// cache breakpoint, then the chat's own sections. The project's memory is
// read once, as it is when the turn starts.
async function buildTutorInstructions(
  request: TutorPromptRequest,
): Promise<SystemModelMessage[]> {
  const memory = await readMemory(request.chat.projectId);
  const context: TutorPromptContext = { ...request, memory };
  const chatTexts = CHAT_SECTIONS.map((section) => section(context));
  return [
    {
      role: "system",
      content: SHARED_SECTIONS.join(SECTION_SEPARATOR),
      providerOptions: PROMPT_CACHE_BREAKPOINT,
    },
    {
      role: "system",
      content: chatTexts.filter((text) => text !== "").join(SECTION_SEPARATOR),
    },
  ];
}

export type { TutorPromptContext, TutorPromptRequest };
export { buildTutorInstructions };
