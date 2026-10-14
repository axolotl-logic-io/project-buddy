// The tutor's system prompt, assembled from two lists of sections. Add a
// section by adding one entry to a list:
// - SHARED_SECTIONS hold the persona's parts that don't depend on the chat,
//   such as the tutor's role and rules. They are cached across chats with
//   the same parts, so they must not depend on the chat.
// - CHAT_SECTIONS render text for one chat, such as its project, its persona
//   and, in the project's interview chat alone, the interview. A section
//   that renders "" is left out.
// Every static text is a part of the persona (src/personas/persona.ts).
import type { SystemModelMessage } from "ai";
import type { ChatWithProject } from "@/chats/chat-rows.ts";
import type { UserId } from "@/ids.ts";
import type { Memory } from "@/memory/memory.ts";
import { readMemory } from "@/memory/memory-store.ts";
import {
  type PersonaParts,
  type PersonaSnapshot,
  renderPersonaPrompt,
} from "@/personas/index.ts";
import { memoryPromptSection } from "@/tutor/memory-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";

// The chat turn a prompt is for, in the owner's chat.
interface TutorPromptRequest {
  readonly owner: UserId;
  readonly chat: ChatWithProject;
  readonly persona: PersonaSnapshot;
}

// What a chat section may read: the name of the chat's project, whether the
// chat is the project's interview chat, its persona, and the project's
// memory as it was read once for the whole prompt, so every section sees the
// same version. A chat's prompt needs nothing else, so it can be rendered for
// a chat not yet saved.
interface TutorPromptContext {
  readonly projectName: string;
  readonly isInterviewChat: boolean;
  readonly persona: PersonaSnapshot;
  readonly memory: Memory;
}

// A section of one chat's prompt, rendered from the context alone.
type ChatPromptSection = (context: TutorPromptContext) => string;

const SECTION_SEPARATOR = "\n\n";

// A section every chat with the same persona parts shares.
type SharedPromptSection = (parts: PersonaParts) => string;

const SHARED_SECTIONS: readonly SharedPromptSection[] = [
  ({ role }: PersonaParts): string => role,
  ({ citation }: PersonaParts): string => citation,
];

const CHAT_SECTIONS: readonly ChatPromptSection[] = [
  ({ projectName }: TutorPromptContext): string =>
    `This chat is about the user's project "${projectName}".`,
  memoryPromptSection,
  // The interview, after the memory it is checked against, in the project's
  // interview chat alone: her other chats are lessons.
  ({ isInterviewChat, persona }: TutorPromptContext): string => {
    if (!isInterviewChat) {
      return "";
    }
    return persona.parts.interview;
  },
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
      content: SHARED_SECTIONS.map((section) =>
        section(context.persona.parts),
      ).join(SECTION_SEPARATOR),
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
    isInterviewChat: request.chat.isInterviewChat,
    persona: request.persona,
    memory,
  });
}

export type { TutorPromptContext, TutorPromptRequest };
export { buildTutorInstructions, renderTutorInstructions };
