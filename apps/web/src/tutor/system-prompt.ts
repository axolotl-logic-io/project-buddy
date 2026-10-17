// The tutor's system prompt, assembled from two lists of sections. Add a
// section by adding one entry to a list:
// - SHARED_SECTIONS hold the buddy's parts that don't depend on the chat,
//   such as the tutor's role and rules. They are cached across one user's
//   chats with the same parts, so they must not depend on the chat; they
//   hold her name, so the cache is per user and parts.
// - CHAT_SECTIONS render text for one chat, such as its project, its buddy
//   and, in the project's interview chat alone, the interview. A section
//   that renders "" is left out.
// Every static text is a part of the buddy (src/buddies/buddy.ts).
// Every {{name}} in a part becomes the user's name here, and only here: the
// stored parts, the tools and the kickoffs keep it as written.
import type { SystemModelMessage } from "ai";
import { NAME_PLACEHOLDER } from "@/accounts/user-name.ts";
import { readUserName } from "@/accounts/users-store.ts";
import {
  type BuddyParts,
  type BuddySnapshot,
  renderBuddyPrompt,
} from "@/buddies/index.ts";
import { BUDDY_PART_KEYS, type BuddyPartKey } from "@/buddies/part-defaults.ts";
import type { ChatInProject } from "@/chats/chat-rows.ts";
import type { UserId } from "@/ids.ts";
import type { Memory } from "@/memory/memory.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { memoryPromptSection } from "@/tutor/memory-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";

// The chat turn a prompt is for, in the owner's chat.
interface TutorPromptRequest {
  readonly owner: UserId;
  readonly chat: ChatInProject;
  readonly buddy: BuddySnapshot;
}

// What a chat section may read: the name of the chat's project, whether the
// chat is the project's interview chat, its buddy, the project's memory as
// it was read once for the whole prompt, so every section sees the same
// version, and the owner's name, or undefined if she has none. A chat's
// prompt needs nothing else, so it can be rendered for a chat not yet saved.
interface TutorPromptContext {
  readonly projectName: string;
  readonly isInterviewChat: boolean;
  readonly buddy: BuddySnapshot;
  readonly memory: Memory;
  readonly userName: string | undefined;
}

// What {{name}} becomes for a user who has given no name.
const NO_NAME = "the user";

// The parts with every literal {{name}} replaced by the user's name, or by
// "the user" when she has none. Other braces stay as written. The name comes
// from a function, not a replacement string, so a "$&" in it stays as typed.
function withUserName(
  parts: BuddyParts,
  userName: string | undefined,
): BuddyParts {
  const name = userName ?? NO_NAME;
  const named: Record<BuddyPartKey, string> = { ...parts };
  for (const key of BUDDY_PART_KEYS) {
    named[key] = parts[key].replaceAll(NAME_PLACEHOLDER, () => name);
  }
  return named;
}

// A section of one chat's prompt, rendered from the context alone.
type ChatPromptSection = (context: TutorPromptContext) => string;

const SECTION_SEPARATOR = "\n\n";

// A section every chat with the same buddy parts shares.
type SharedPromptSection = (parts: BuddyParts) => string;

const SHARED_SECTIONS: readonly SharedPromptSection[] = [
  ({ role }: BuddyParts): string => role,
  ({ citation }: BuddyParts): string => citation,
];

const CHAT_SECTIONS: readonly ChatPromptSection[] = [
  ({ projectName }: TutorPromptContext): string =>
    `This chat is about the user's project "${projectName}".`,
  memoryPromptSection,
  // The interview, after the memory it is checked against, in the project's
  // interview chat alone: her other chats are lessons.
  ({ isInterviewChat, buddy }: TutorPromptContext): string => {
    if (!isInterviewChat) {
      return "";
    }
    return buddy.parts.interview;
  },
  ({ buddy }: TutorPromptContext): string => renderBuddyPrompt(buddy),
];

// The system messages for one chat turn, given the project's memory: the
// shared sections, marked as a cache breakpoint, then the chat's own
// sections.
function renderTutorInstructions(
  context: TutorPromptContext,
): SystemModelMessage[] {
  const named: TutorPromptContext = {
    ...context,
    buddy: {
      ...context.buddy,
      parts: withUserName(context.buddy.parts, context.userName),
    },
  };
  const chatTexts = CHAT_SECTIONS.map((section) => section(named));
  return [
    {
      role: "system",
      content: SHARED_SECTIONS.map((section) =>
        section(named.buddy.parts),
      ).join(SECTION_SEPARATOR),
      providerOptions: PROMPT_CACHE_BREAKPOINT,
    },
    {
      role: "system",
      content: chatTexts.filter((text) => text !== "").join(SECTION_SEPARATOR),
    },
  ];
}

// The system messages for one chat turn, with the project's memory and the
// owner's name read once, together, as they are when the turn starts.
async function buildTutorInstructions(
  request: TutorPromptRequest,
): Promise<SystemModelMessage[]> {
  const [memory, userName] = await Promise.all([
    readMemory(request.owner, request.chat.projectId),
    readUserName(request.owner),
  ]);
  return renderTutorInstructions({
    projectName: request.chat.projectName,
    isInterviewChat: request.chat.isInterviewChat,
    buddy: request.buddy,
    memory,
    userName,
  });
}

export type { TutorPromptContext, TutorPromptRequest };
export { buildTutorInstructions, renderTutorInstructions, withUserName };
