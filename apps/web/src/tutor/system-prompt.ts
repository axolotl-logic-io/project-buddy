// The tutor's system prompt, assembled from two lists of sections. Add a
// section by adding one entry to a list:
// - SHARED_SECTIONS hold the buddy's parts that don't depend on the chat,
//   such as the tutor's role and rules. They are cached across one user's
//   chats with the same parts, so they must not depend on the chat; they
//   hold the user's name and enabled skills, so the prefix is per account
//   preferences and buddy parts.
// - CHAT_SECTIONS render text for one chat, such as its place (its project,
//   or the central chat part in the user's central chat, which is in none),
//   its project's memory, its buddy and, in the project's interview chat
//   alone, the interview. A section that renders "" is left out.
// Every static text is a part of the buddy (src/buddies/buddy.ts).
// Every {{name}} in a part becomes the user's name here, and only here: the
// stored parts, the tools and the kickoffs keep it as written.
import type { SystemModelMessage } from "ai";
import { NAME_PLACEHOLDER } from "@/accounts/user-name.ts";
import { readPromptPreferences } from "@/accounts/users-store.ts";
import {
  type BuddyParts,
  type BuddySnapshot,
  renderBuddyPrompt,
} from "@/buddies/index.ts";
import {
  BUDDY_PART_KEYS,
  BUDDY_SKILL_FLAGS,
  type BuddyPartKey,
} from "@/buddies/part-defaults.ts";
import type { FoundChat } from "@/chats/chat-rows.ts";
import { type FlagId, hiddenFromSwitched } from "@/flags/flags.ts";
import type { UserId } from "@/ids.ts";
import type { Memory } from "@/memory/memory.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { memoryPromptSection } from "@/tutor/memory-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";

// The chat turn a prompt is for, in the owner's chat.
interface TutorPromptRequest {
  readonly owner: UserId;
  readonly chat: FoundChat;
  readonly buddy: BuddySnapshot;
}

// What a chat section may read: the chat's buddy and the owner's name, or
// undefined if she has none, and, for a chat in a project, the project's
// name, whether the chat is the project's interview chat and the project's
// memory as it was read once for the whole prompt, so every section sees the
// same version. The user's central chat is in no project, so it has none of
// those. A chat's prompt needs nothing else, so it can be rendered for a chat
// not yet saved.
type TutorPromptContext = ProjectPromptContext | CentralPromptContext;

interface ProjectPromptContext {
  readonly kind: "project";
  readonly projectName: string;
  readonly isInterviewChat: boolean;
  readonly buddy: BuddySnapshot;
  readonly memory: Memory;
  readonly userName: string | undefined;
  readonly hiddenFlags: readonly FlagId[];
}

interface CentralPromptContext {
  readonly kind: "central";
  readonly buddy: BuddySnapshot;
  readonly userName: string | undefined;
  readonly hiddenFlags: readonly FlagId[];
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

// Skills are static per buddy and account choice, so they share the cache
// prefix rather than paying for the same text on every tool step.
function planningSkillsSection({
  buddy,
  hiddenFlags,
}: TutorPromptContext): string {
  return BUDDY_PART_KEYS.filter((key) => {
    const flag = BUDDY_SKILL_FLAGS[key];
    return flag !== undefined && !hiddenFlags.includes(flag);
  })
    .map((key) => buddy.parts[key])
    .filter((text) => text !== "")
    .join(SECTION_SEPARATOR);
}

type SharedPromptSection = (context: TutorPromptContext) => string;

const SHARED_SECTIONS: readonly SharedPromptSection[] = [
  ({ buddy }: TutorPromptContext): string => buddy.parts.role,
  ({ buddy }: TutorPromptContext): string => buddy.parts.citation,
  planningSkillsSection,
];

// Where the chat is: its project, or the central chat part.
function placeSection(context: TutorPromptContext): string {
  switch (context.kind) {
    case "project":
      return `This chat is about the user's project "${context.projectName}".`;
    case "central":
      return context.buddy.parts.centralChat;
    default: {
      const unknownPlace: never = context;
      return unknownPlace;
    }
  }
}

// The interview, after the memory it is checked against, in the project's
// interview chat alone: her other chats are lessons, and her central chat
// has no project to interview her about.
function interviewSection(context: TutorPromptContext): string {
  switch (context.kind) {
    case "project":
      if (!context.isInterviewChat) {
        return "";
      }
      return context.buddy.parts.interview;
    case "central":
      return "";
    default: {
      const unknownPlace: never = context;
      return unknownPlace;
    }
  }
}

const CHAT_SECTIONS: readonly ChatPromptSection[] = [
  placeSection,
  memoryPromptSection,
  interviewSection,
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
      content: SHARED_SECTIONS.map((section) => section(named))
        .filter((text) => text !== "")
        .join(SECTION_SEPARATOR),
      providerOptions: PROMPT_CACHE_BREAKPOINT,
    },
    {
      role: "system",
      content: chatTexts.filter((text) => text !== "").join(SECTION_SEPARATOR),
    },
  ];
}

// The system messages for one chat turn, with the owner's name and, in a
// project chat, the project's memory read once, together, as they are when
// the turn starts.
async function buildTutorInstructions({
  owner,
  chat,
  buddy,
}: TutorPromptRequest): Promise<SystemModelMessage[]> {
  switch (chat.kind) {
    case "project": {
      const [memory, preferences] = await Promise.all([
        readMemory(owner, chat.projectId),
        readPromptPreferences(owner),
      ]);
      return renderTutorInstructions({
        kind: "project",
        projectName: chat.projectName,
        isInterviewChat: chat.isInterviewChat,
        buddy,
        memory,
        userName: preferences.userName,
        hiddenFlags: hiddenFromSwitched(preferences.hiddenExtras),
      });
    }
    case "central": {
      const preferences = await readPromptPreferences(owner);
      return renderTutorInstructions({
        kind: "central",
        buddy,
        userName: preferences.userName,
        hiddenFlags: hiddenFromSwitched(preferences.hiddenExtras),
      });
    }
    default: {
      const unknownChat: never = chat;
      return unknownChat;
    }
  }
}

export type { ProjectPromptContext, TutorPromptContext, TutorPromptRequest };
export { buildTutorInstructions, renderTutorInstructions, withUserName };
