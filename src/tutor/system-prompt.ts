// The tutor's system prompt, assembled from two lists of sections. Add a
// section by adding one entry to a list:
// - SHARED_SECTIONS hold text that is the same in every chat, such as the
//   tutor's role and rules. They are cached across chats, so they must not
//   depend on the chat.
// - CHAT_SECTIONS render text for one chat, such as its project and persona.
//   A section that renders "" is left out.
import type { SystemModelMessage } from "ai";
import type { ChatWithProject } from "@/chats/chat-rows.ts";
import type { UserId } from "@/ids.ts";
import type { Memory } from "@/memory/memory.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { type Persona, renderPersonaPrompt } from "@/personas/index.ts";
import { CITATION_RULES } from "@/tutor/citation-prompt.ts";
import { INTERVIEW_PROMPT } from "@/tutor/interview-prompt.ts";
import { memoryPromptSection } from "@/tutor/memory-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";

// The chat turn a prompt is for, in the owner's chat.
interface TutorPromptRequest {
  readonly owner: UserId;
  readonly chat: ChatWithProject;
  readonly persona: Persona;
}

// What a chat section may read: the name of the chat's project, its persona,
// and the project's memory as it was read once for the whole prompt, so every
// section sees the same version. A chat's prompt needs nothing else, so it
// can be rendered for a chat not yet saved.
interface TutorPromptContext {
  readonly projectName: string;
  readonly persona: Persona;
  readonly memory: Memory;
}

// A section of one chat's prompt, rendered from the context alone.
type ChatPromptSection = (context: TutorPromptContext) => string;

const SECTION_SEPARATOR = "\n\n";

const SHARED_SECTIONS: readonly string[] = [
  "You are a Blender tutor. You teach the user Blender through their own projects.",
  CITATION_RULES,
  INTERVIEW_PROMPT,
];

const CHAT_SECTIONS: readonly ChatPromptSection[] = [
  ({ projectName }: TutorPromptContext): string =>
    `This chat is about the user's project "${projectName}".`,
  memoryPromptSection,
  ({ persona }: TutorPromptContext): string => renderPersonaPrompt(persona),
];

// The system messages for one chat turn, given the project's memory: the
// shared sections, marked as a cache breakpoint, then the chat's own
// sections.
function renderTutorInstructions(
  context: TutorPromptContext,
): SystemModelMessage[] {
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

// The system messages for one chat turn, with the project's memory read
// once, as it is when the turn starts.
async function buildTutorInstructions(
  request: TutorPromptRequest,
): Promise<SystemModelMessage[]> {
  const memory = await readMemory(request.owner, request.chat.projectId);
  return renderTutorInstructions({
    projectName: request.chat.projectName,
    persona: request.persona,
    memory,
  });
}

export type { TutorPromptContext, TutorPromptRequest };
export { buildTutorInstructions, renderTutorInstructions };
