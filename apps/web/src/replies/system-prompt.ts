// The buddy's system prompt, assembled from two lists of sections. Add a
// section by adding one entry to a list:
// - SHARED_SECTIONS don't depend on the chat: the global prompt
//   (global-prompt.ts) and the list of the account's activities. They are
//   cached across one user's chats, so they must not depend on the chat.
// - CHAT_SECTIONS render text for one chat: its project, or the standalone
//   chat's text when it is in none, its project's memory, its current
//   activity and its buddy. A section that renders "" is left out.
// Every {{name}} in the buddy's and the activity's parts becomes the user's
// name here, and only here: the stored parts keep it as written.
import type { SystemModelMessage } from "ai";
import { NAME_PLACEHOLDER } from "@/accounts/user-name.ts";
import { readUserName } from "@/accounts/users-store.ts";
import type { ActivitySnapshot } from "@/activities/activity.ts";
import type { ActivityChoice } from "@/activities/activity-choice.ts";
import { activityChoices } from "@/activities/activity-choices.ts";
import { currentActivity } from "@/activities/activity-sessions.ts";
import { SELECT_ACTIVITY_TOOL } from "@/activities/select-activity-contract.ts";
import { type BuddySnapshot, renderBuddyPrompt } from "@/buddies/index.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import type { UserId } from "@/ids.ts";
import type { Memory } from "@/memory/memory.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { GLOBAL_PROMPT_SECTIONS } from "@/replies/global-prompt.ts";
import { memoryPromptSection } from "@/replies/memory-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/replies/prompt-cache.ts";
import { STANDALONE_CHAT_PROMPT } from "@/replies/standalone-chat-prompt.ts";

// The chat turn a prompt is for, in the owner's chat.
interface ReplyPromptRequest {
  readonly owner: UserId;
  readonly chat: Chat;
  readonly buddy: BuddySnapshot;
}

// What a section may read: the activities the account has, the chat's
// buddy and current activity, the owner's name, or undefined if she has
// none, and, for a chat in a project, the project. A standalone chat is in
// no project, so it has none. A chat's prompt needs nothing else, so it can
// be rendered for a chat not yet saved.
interface ReplyPromptContext {
  readonly activities: readonly ActivityChoice[];
  readonly project: PromptProject | undefined;
  readonly buddy: BuddySnapshot;
  readonly activity: ActivitySnapshot;
  readonly userName: string | undefined;
}

// A chat's project as its prompt reads it: its name, and its memory as it
// was read once for the whole prompt, so every section sees the same
// version.
interface PromptProject {
  readonly name: string;
  readonly memory: Memory;
}

// What {{name}} becomes for a user who has given no name.
const NO_NAME = "the user";

// The text with every literal {{name}} replaced by the user's name, or by
// "the user" when she has none. Other braces stay as written. The name comes
// from a function, not a replacement string, so a "$&" in it stays as typed.
function withUserName(text: string, userName: string | undefined): string {
  const name = userName ?? NO_NAME;
  return text.replaceAll(NAME_PLACEHOLDER, () => name);
}

// A section of one chat's prompt, rendered from the context alone.
type PromptSection = (context: ReplyPromptContext) => string;

const SECTION_SEPARATOR = "\n\n";

// One activity in the buddy's list: its id, its name and, if it has one,
// what it is.
function activityLine({ id, name, description }: ActivityChoice): string {
  if (description === undefined) {
    return `- \`${id}\`: ${name}.`;
  }
  return `- \`${id}\`: ${name}. ${description}`;
}

// The activities the buddy can move the chat into, built in and the
// account's own. They depend only on the account, so they share the cache
// prefix.
function activitiesSection({ activities }: ReplyPromptContext): string {
  return [
    "# Activities",
    `An activity sets the scene a chat plays out. The chat's current activity is given below. When the user asks for another activity, or another one clearly suits what they want to do now, call \`${SELECT_ACTIVITY_TOOL}\` with its id, then follow its instructions from the tool's result. These are the activities:`,
    ...activities.map(activityLine),
  ].join("\n");
}

const SHARED_SECTIONS: readonly PromptSection[] = [
  ...GLOBAL_PROMPT_SECTIONS.map(
    (section: string): PromptSection =>
      (): string =>
        section,
  ),
  activitiesSection,
];

// Where the chat is: its project, or no project in a standalone chat.
function placeSection({ project }: ReplyPromptContext): string {
  if (project === undefined) {
    return STANDALONE_CHAT_PROMPT;
  }
  return `This chat is about the user's project "${project.name}".`;
}

// The chat's current activity, after the memory it may work from.
function activitySection({ activity }: ReplyPromptContext): string {
  return activity.parts.instructions;
}

const CHAT_SECTIONS: readonly PromptSection[] = [
  placeSection,
  memoryPromptSection,
  activitySection,
  ({ buddy }: ReplyPromptContext): string => renderBuddyPrompt(buddy),
];

// The texts of sections, without the empty ones, as one system message's
// content.
function rendered(
  sections: readonly PromptSection[],
  context: ReplyPromptContext,
): string {
  return sections
    .map((section) => section(context))
    .filter((text) => text !== "")
    .join(SECTION_SEPARATOR);
}

// The system messages for one chat turn: the shared sections, marked as a
// cache breakpoint, then the chat's own sections.
function renderReplyInstructions(
  context: ReplyPromptContext,
): SystemModelMessage[] {
  const { buddy, activity, userName } = context;
  const named: ReplyPromptContext = {
    ...context,
    buddy: {
      ...buddy,
      parts: {
        voice: withUserName(buddy.parts.voice, userName),
        habits: withUserName(buddy.parts.habits, userName),
      },
    },
    activity: {
      ...activity,
      parts: {
        instructions: withUserName(activity.parts.instructions, userName),
        openingKickoff: withUserName(activity.parts.openingKickoff, userName),
      },
    },
  };
  return [
    {
      role: "system",
      content: rendered(SHARED_SECTIONS, named),
      providerOptions: PROMPT_CACHE_BREAKPOINT,
    },
    { role: "system", content: rendered(CHAT_SECTIONS, named) },
  ];
}

// The chat's project as its prompt reads it, with the owner's memory of it
// as it is now; undefined in a standalone chat.
async function promptProject(
  owner: UserId,
  chat: Pick<Chat, "project">,
): Promise<PromptProject | undefined> {
  if (chat.project === undefined) {
    return undefined;
  }
  return {
    name: chat.project.name,
    memory: await readMemory(owner, chat.project.id),
  };
}

// The system messages for one chat turn, with the owner's name and
// activities, the chat's current activity and, in a project chat, the
// project's memory, read together, as they are when the turn starts.
async function buildReplyInstructions({
  owner,
  chat,
  buddy,
}: ReplyPromptRequest): Promise<SystemModelMessage[]> {
  const [activities, project, activity, userName] = await Promise.all([
    activityChoices(owner),
    promptProject(owner, chat),
    currentActivity(owner, chat),
    readUserName(owner),
  ]);
  return renderReplyInstructions({
    activities,
    project,
    buddy,
    activity,
    userName,
  });
}

export type { PromptProject, ReplyPromptContext, ReplyPromptRequest };
export { buildReplyInstructions, renderReplyInstructions, withUserName };
