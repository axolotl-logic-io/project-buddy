// The buddy's system prompt, assembled from two lists of sections. Add a
// section by adding one entry to a list:
// - SHARED_SECTIONS don't depend on the chat: the global prompt
//   (global-prompt.ts) and the lists of the account's activities and
//   spells. They are cached across one user's chats, so they must not
//   depend on the chat.
// - CHAT_SECTIONS render text for one chat: its project, or the standalone
//   chat's text when it is in none, the rules for several people when more
//   than one has written in it, its project's memory and newest
//   milestones, its current activity and its buddy. A section that renders
//   "" is left out.
// Every {{name}} in the buddy's and the activity's parts, and in the spells'
// when-to-use lines, becomes the user's name here: the stored parts keep it
// as written. cast_spell names the spell's instructions the same way.
import type { SystemModelMessage } from "ai";
import { withUserName } from "@/accounts/user-name.ts";
import { readUserName } from "@/accounts/users-store.ts";
import type { ActivitySnapshot } from "@/activities/activity.ts";
import type { ActivityChoice } from "@/activities/activity-choice.ts";
import { activityChoices } from "@/activities/activity-choices.ts";
import { currentActivity } from "@/activities/activity-sessions.ts";
import { SELECT_ACTIVITY_TOOL } from "@/activities/select-activity-contract.ts";
import { type BuddySnapshot, renderBuddyPrompt } from "@/buddies/index.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import type { ProjectId, UserId } from "@/ids.ts";
import type { Memory } from "@/memory/memory.ts";
import { readMemory } from "@/memory/memory-store.ts";
import type { Milestone } from "@/milestones/milestone.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import {
  GLOBAL_PROMPT_SECTIONS,
  SEVERAL_AUTHORS_RULES,
} from "@/replies/global-prompt.ts";
import { memoryPromptSection } from "@/replies/memory-prompt.ts";
import {
  MILESTONES_IN_PROMPT,
  milestonesPromptSection,
} from "@/replies/milestones-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/replies/prompt-cache.ts";
import { STANDALONE_CHAT_PROMPT } from "@/replies/standalone-chat-prompt.ts";
import { CAST_SPELL_TOOL } from "@/spells/cast-spell-contract.ts";
import type { SpellChoice } from "@/spells/spell-choice.ts";
import { spellChoices } from "@/spells/spell-choices.ts";

// The chat turn a prompt is for, in the acting user's chat, and whether more than
// one person has written in the chat (src/replies/author-names.ts).
interface ReplyPromptRequest {
  readonly actingUser: UserId;
  readonly chat: Chat;
  readonly buddy: BuddySnapshot;
  readonly severalAuthors?: boolean | undefined;
}

// What a section may read: the activities and spells the account has, the
// chat's buddy and current activity, the acting user's name, or undefined if she has
// none, for a chat in a project, the project, and whether several people have
// written in the chat, which no new chat has. A standalone chat is in no
// project, so it has none. A chat's prompt needs nothing else, so it can be
// rendered for a chat not yet saved.
interface ReplyPromptContext {
  readonly activities: readonly ActivityChoice[];
  readonly spells: readonly SpellChoice[];
  readonly project: PromptProject | undefined;
  readonly buddy: BuddySnapshot;
  readonly activity: ActivitySnapshot;
  readonly userName: string | undefined;
  readonly severalAuthors?: boolean | undefined;
}

// A chat's project as its prompt reads it: its name, its memory and its
// newest milestones, newest first, as they were read once for the whole
// prompt, so every section sees the same version.
interface PromptProject {
  readonly name: string;
  readonly memory: Memory;
  readonly milestones: readonly Milestone[];
}

// A section of one chat's prompt, rendered from the context alone.
type PromptSection = (context: ReplyPromptContext) => string;

const SECTION_SEPARATOR = "\n\n";

// Any run of white space, line breaks included.
const WHITE_SPACE = /\s+/gu;

// The text on one line: each run of white space as one space, trimmed.
function oneLine(text: string): string {
  return text.replace(WHITE_SPACE, " ").trim();
}

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

// One spell in the buddy's list: its id, its name and when to use it, each
// on the one line, so no line break or heading in them can end the list.
function spellLine({ id, name, whenToUse }: SpellChoice): string {
  return `- \`${id}\`: ${oneLine(name)}. ${oneLine(whenToUse)}`;
}

// The spells the buddy can cast, built in and the account's own. They
// depend only on the account, so they share the cache prefix.
function spellsSection({ spells }: ReplyPromptContext): string {
  return [
    "# Spells",
    `A spell is a set of instructions you load only when you need them. When a spell's when-to-use line fits what the user needs now, call \`${CAST_SPELL_TOOL}\` with its id before you act, then follow the instructions in the tool's result. A spell gives you no new tools. These are the spells:`,
    ...spells.map(spellLine),
  ].join("\n");
}

const SHARED_SECTIONS: readonly PromptSection[] = [
  ...GLOBAL_PROMPT_SECTIONS.map(
    (section: string): PromptSection =>
      (): string =>
        section,
  ),
  activitiesSection,
  spellsSection,
];

// Where the chat is: its project, or no project in a standalone chat.
function placeSection({ project }: ReplyPromptContext): string {
  if (project === undefined) {
    return STANDALONE_CHAT_PROMPT;
  }
  return `This chat is about the user's project "${project.name}".`;
}

// How to talk with several people, in a chat where more than one has
// written; nothing in any other chat.
function severalAuthorsSection({ severalAuthors }: ReplyPromptContext): string {
  if (severalAuthors === true) {
    return SEVERAL_AUTHORS_RULES;
  }
  return "";
}

// The chat's current activity, after the memory it may work from.
function activitySection({ activity }: ReplyPromptContext): string {
  return activity.definition.prompt;
}

const CHAT_SECTIONS: readonly PromptSection[] = [
  placeSection,
  severalAuthorsSection,
  memoryPromptSection,
  milestonesPromptSection,
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
  const { buddy, activity, spells, userName } = context;
  const named: ReplyPromptContext = {
    ...context,
    spells: spells.map((spell) => ({
      ...spell,
      whenToUse: withUserName(spell.whenToUse, userName),
    })),
    buddy: {
      ...buddy,
      definition: {
        prompt: withUserName(buddy.definition.prompt, userName),
      },
    },
    activity: {
      ...activity,
      definition: {
        prompt: withUserName(activity.definition.prompt, userName),
        openingRequest: withUserName(
          activity.definition.openingRequest,
          userName,
        ),
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

// The acting user's project as a chat's prompt reads it, with its memory and
// newest milestones as they are now.
async function readPromptProject(
  actingUser: UserId,
  project: { readonly id: ProjectId; readonly name: string },
): Promise<PromptProject> {
  const [memory, milestones] = await Promise.all([
    readMemory(actingUser, project.id),
    listMilestones(actingUser, project.id, MILESTONES_IN_PROMPT),
  ]);
  return { name: project.name, memory, milestones };
}

// The chat's project as its prompt reads it; undefined in a standalone chat.
function promptProject(
  actingUser: UserId,
  chat: Pick<Chat, "project">,
): Promise<PromptProject | undefined> {
  if (chat.project === undefined) {
    return Promise.resolve(undefined);
  }
  return readPromptProject(actingUser, chat.project);
}

// The system messages for one chat turn, with the acting user's name, activities and
// spells, the chat's current activity and, in a project chat, the project's
// memory and newest milestones, read together, as they are when the turn
// starts.
async function buildReplyInstructions({
  actingUser,
  chat,
  buddy,
  severalAuthors,
}: ReplyPromptRequest): Promise<SystemModelMessage[]> {
  const [activities, spells, project, activity, userName] = await Promise.all([
    activityChoices(actingUser),
    spellChoices(actingUser),
    promptProject(actingUser, chat),
    currentActivity(actingUser, chat),
    readUserName(actingUser),
  ]);
  return renderReplyInstructions({
    activities,
    spells,
    project,
    buddy,
    activity,
    userName,
    severalAuthors,
  });
}

export type { PromptProject, ReplyPromptContext, ReplyPromptRequest };
export { buildReplyInstructions, readPromptProject, renderReplyInstructions };
