// The buddy's system prompt, assembled from two lists of sections. Add a
// section by adding one entry to a list:
// - SHARED_SECTIONS hold the buddy's parts that don't depend on the chat,
//   such as the buddy's role and rules. They are cached across one user's
//   chats with the same parts, so they must not depend on the chat; they
//   hold the user's name and enabled skills, so the prefix is per account
//   preferences and buddy parts.
// - CHAT_SECTIONS render text for one chat, such as its project, or the
//   centralChat part in a standalone chat, which is in none, its project's
//   memory, its buddy and, in the project's interview chat alone, the
//   interview. A section that renders "" is left out.
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
import type { Chat } from "@/chats/chat-rows.ts";
import { type FlagId, hiddenFromSwitched } from "@/flags/flags.ts";
import type { UserId } from "@/ids.ts";
import type { Memory } from "@/memory/memory.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { memoryPromptSection } from "@/replies/memory-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/replies/prompt-cache.ts";

// The chat turn a prompt is for, in the owner's chat.
interface ReplyPromptRequest {
  readonly owner: UserId;
  readonly chat: Chat;
  readonly buddy: BuddySnapshot;
}

// What a chat section may read: the chat's buddy, the owner's name, or
// undefined if she has none, the account's hidden flags and, for a chat in a
// project, the project. A standalone chat is in no project, so it has none.
// A chat's prompt needs nothing else, so it can be rendered for a chat not
// yet saved.
interface ReplyPromptContext {
  readonly project: PromptProject | undefined;
  readonly buddy: BuddySnapshot;
  readonly userName: string | undefined;
  readonly hiddenFlags: readonly FlagId[];
}

// A chat's project as its prompt reads it: its name, whether the chat is
// the project's interview chat, and its memory as it was read once for the
// whole prompt, so every section sees the same version.
interface PromptProject {
  readonly name: string;
  readonly isInterviewChat: boolean;
  readonly memory: Memory;
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
type ChatPromptSection = (context: ReplyPromptContext) => string;

const SECTION_SEPARATOR = "\n\n";

// Skills are static per buddy and account choice, so they share the cache
// prefix rather than paying for the same text on every tool step.
function planningSkillsSection({
  buddy,
  hiddenFlags,
}: ReplyPromptContext): string {
  return BUDDY_PART_KEYS.filter((key) => {
    const flag = BUDDY_SKILL_FLAGS[key];
    return flag !== undefined && !hiddenFlags.includes(flag);
  })
    .map((key) => buddy.parts[key])
    .filter((text) => text !== "")
    .join(SECTION_SEPARATOR);
}

type SharedPromptSection = (context: ReplyPromptContext) => string;

const SHARED_SECTIONS: readonly SharedPromptSection[] = [
  ({ buddy }: ReplyPromptContext): string => buddy.parts.role,
  ({ buddy }: ReplyPromptContext): string => buddy.parts.citation,
  planningSkillsSection,
];

// Where the chat is: its project, or the centralChat part in a standalone
// chat.
function placeSection({ project, buddy }: ReplyPromptContext): string {
  if (project === undefined) {
    return buddy.parts.centralChat;
  }
  return `This chat is about the user's project "${project.name}".`;
}

// The interview, after the memory it is checked against, in the project's
// interview chat alone: a standalone chat has no project to interview her
// about.
function interviewSection({ project, buddy }: ReplyPromptContext): string {
  if (project === undefined || !project.isInterviewChat) {
    return "";
  }
  return buddy.parts.interview;
}

const CHAT_SECTIONS: readonly ChatPromptSection[] = [
  placeSection,
  memoryPromptSection,
  interviewSection,
  ({ buddy }: ReplyPromptContext): string => renderBuddyPrompt(buddy),
];

// The system messages for one chat turn, given the project's memory: the
// shared sections, marked as a cache breakpoint, then the chat's own
// sections.
function renderReplyInstructions(
  context: ReplyPromptContext,
): SystemModelMessage[] {
  const named: ReplyPromptContext = {
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

// The chat's project as its prompt reads it, with the owner's memory of it
// as it is now; undefined in a standalone chat.
async function promptProject(
  owner: UserId,
  chat: Chat,
): Promise<PromptProject | undefined> {
  if (chat.project === undefined) {
    return undefined;
  }
  return {
    name: chat.project.name,
    isInterviewChat: chat.isInterviewChat,
    memory: await readMemory(owner, chat.project.id),
  };
}

// The system messages for one chat turn, with the owner's name and, in a
// project chat, the project's memory read once, together, as they are when
// the turn starts.
async function buildReplyInstructions({
  owner,
  chat,
  buddy,
}: ReplyPromptRequest): Promise<SystemModelMessage[]> {
  const [project, preferences] = await Promise.all([
    promptProject(owner, chat),
    readPromptPreferences(owner),
  ]);
  return renderReplyInstructions({
    project,
    buddy,
    userName: preferences.userName,
    hiddenFlags: hiddenFromSwitched(preferences.hiddenExtras),
  });
}

export type { PromptProject, ReplyPromptContext, ReplyPromptRequest };
export { buildReplyInstructions, renderReplyInstructions, withUserName };
