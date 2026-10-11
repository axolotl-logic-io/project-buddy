// The tutor's system prompt, assembled from two lists of sections. Add a
// section by adding one entry to a list:
// - SHARED_SECTIONS hold text that is the same in every chat, such as the
//   tutor's role and rules. They are cached across chats, so they must not
//   depend on the chat.
// - CHAT_SECTIONS render text for one chat, such as its project and persona.
import type { SystemModelMessage } from "ai";
import type { ChatWithProject } from "@/chats/store.ts";
import { type Persona, renderPersonaPrompt } from "@/personas/index.ts";
import { CITATION_RULES } from "@/tutor/citation-prompt.ts";
import { memoryPromptSection } from "@/tutor/memory-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";

// What a chat section may read.
interface TutorPromptContext {
  readonly chat: ChatWithProject;
  readonly persona: Persona;
}

// A section of one chat's prompt. It may load what it renders.
type ChatPromptSection = (
  context: TutorPromptContext,
) => string | Promise<string>;

const SECTION_SEPARATOR = "\n\n";

const SHARED_SECTIONS: readonly string[] = [
  "You are a Blender tutor. You teach Autumn Blender through her own projects.",
  CITATION_RULES,
];

const CHAT_SECTIONS: readonly ChatPromptSection[] = [
  ({ chat }: TutorPromptContext): string =>
    `This chat is about Autumn's project "${chat.projectName}".`,
  memoryPromptSection,
  ({ persona }: TutorPromptContext): string => renderPersonaPrompt(persona),
];

// The system messages for one chat turn: the shared sections, marked as a
// cache breakpoint, then the chat's own sections.
async function buildTutorInstructions(
  context: TutorPromptContext,
): Promise<SystemModelMessage[]> {
  const chatTexts = await Promise.all(
    CHAT_SECTIONS.map((section) => section(context)),
  );
  return [
    {
      role: "system",
      content: SHARED_SECTIONS.join(SECTION_SEPARATOR),
      providerOptions: PROMPT_CACHE_BREAKPOINT,
    },
    { role: "system", content: chatTexts.join(SECTION_SEPARATOR) },
  ];
}

export type { TutorPromptContext };
export { buildTutorInstructions };
