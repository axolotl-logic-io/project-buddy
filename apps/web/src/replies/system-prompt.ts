import type { SystemModelMessage } from "ai";
import { readUserName } from "@/accounts/users-store.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import type { ConstructSnapshot } from "@/constructs/index.ts";
import type { ChatId, QuestId, UserId } from "@/ids.ts";
import type { Milestone } from "@/milestones/milestone.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import type { QuestStatus, StatusApproval } from "@/quests/quest-status.ts";
import { readLatestStatusApproval } from "@/quests/quest-status-store.ts";
import { getQuest } from "@/quests/store.ts";
import {
  GLOBAL_PROMPT_SECTIONS,
  SEVERAL_AUTHORS_RULES,
} from "@/replies/global-prompt.ts";
import {
  MILESTONES_IN_PROMPT,
  milestonesPromptSection,
} from "@/replies/milestones-prompt.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/replies/prompt-cache.ts";
import { startingContextSection } from "@/replies/starting-context.ts";
import { tasksPromptSection } from "@/replies/tasks-prompt.ts";
import { visualDescriptionSection } from "@/replies/visual-description.ts";
import { getSpell, listSpells, type SpellId } from "@/spells/spell.ts";
import type { SpellSnapshot } from "@/spells/spell-definition.ts";
import { spellDestinationLabel } from "@/spells/spell-destination.ts";
import { readActiveSpell } from "@/spells/spell-store.ts";
import { EMPTY_TASKS, type Tasks } from "@/tasks/tasks.ts";
import { readTasks } from "@/tasks/tasks-store.ts";

// The chat turn a prompt is for, in the acting user's chat, and whether more than
// one person has written in the chat (src/replies/author-names.ts).
interface ReplyPromptRequest {
  readonly actingUser: UserId;
  readonly chat: Chat;
  readonly construct: ConstructSnapshot;
  readonly severalAuthors?: boolean | undefined;
}

interface ReplyPromptContext {
  readonly quest: PromptQuest;
  readonly construct: ConstructSnapshot;
  readonly spell?: SpellId | undefined;
  readonly activeSpell?: SpellSnapshot | undefined;
  readonly userName: string | undefined;
  readonly severalAuthors?: boolean | undefined;
}

// A chat's quest as its prompt reads it: its name, its memory, its tasks
// and its newest milestones, newest first, as they were read once for the
// whole prompt, so every section sees the same version.
interface PromptQuest {
  readonly status?: QuestStatus | undefined;
  readonly latestApproval?: StatusApproval | undefined;
  readonly name: string;
  readonly startingContext?: string | undefined;
  readonly tasks: Tasks;
  readonly milestones: readonly Milestone[];
}

// A section of one chat's prompt, rendered from the context alone.
type PromptSection = (context: ReplyPromptContext) => string;

const SECTION_SEPARATOR = "\n\n";

function spellsSection(): string {
  return [
    "# Spells",
    ...listSpells().map(
      (spell) => `- \`${spell.id}\`: ${spell.name}. ${spell.description}`,
    ),
  ].join("\n");
}

const SHARED_SECTIONS: readonly PromptSection[] = [
  ...GLOBAL_PROMPT_SECTIONS.map(
    (section: string): PromptSection =>
      (): string =>
        section,
  ),
  spellsSection,
];

// The quest the conversation is about.
function placeSection({ quest }: ReplyPromptContext): string {
  return `This conversation is about the user's quest "${quest.name}".`;
}

// How to talk with several people, in a chat where more than one has
// written; nothing in any other chat.
function severalAuthorsSection({ severalAuthors }: ReplyPromptContext): string {
  if (severalAuthors === true) {
    return SEVERAL_AUTHORS_RULES;
  }
  return "";
}

function spellSection({ spell, activeSpell }: ReplyPromptContext): string {
  if (activeSpell !== undefined) {
    return `Active spell: ${activeSpell.name}\nMessage destination: ${spellDestinationLabel(activeSpell.definition.destination)}`;
  }
  if (spell === undefined) {
    return "No spell is active.";
  }
  return `Active spell: ${getSpell(spell).name}`;
}

const CHAT_SECTIONS: readonly PromptSection[] = [
  placeSection,
  ({ quest }: ReplyPromptContext): string => {
    if (quest.status === undefined) {
      return "";
    }
    return `Current quest status: ${quest.status}. This current status takes precedence over older proposal cards in the conversation.`;
  },
  ({ quest }: ReplyPromptContext): string => {
    const approval = quest.latestApproval;
    if (approval === undefined) {
      return "";
    }
    return `Latest status proposal in this conversation: ${approval.fromStatus} to ${approval.toStatus}; decision: ${approval.decision}. This live decision supersedes the original tool result. Only pending cards have confirmation buttons. A declined, approved or outdated card cannot be confirmed again. If the user requests a change after that decision, create a fresh proposal; do not claim an old card is still waiting. This context never authorizes a status change.`;
  },
  severalAuthorsSection,
  startingContextSection,
  tasksPromptSection,
  milestonesPromptSection,
  spellSection,
  visualDescriptionSection,
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
  return [
    {
      role: "system",
      content: rendered(SHARED_SECTIONS, context),
      providerOptions: PROMPT_CACHE_BREAKPOINT,
    },
    { role: "system", content: rendered(CHAT_SECTIONS, context) },
  ];
}

// The acting user's quest as a chat's prompt reads it, with its memory,
// tasks and newest milestones as they are now.
async function readPromptQuest(
  actingUser: UserId,
  quest: { readonly id: QuestId; readonly name: string },
): Promise<PromptQuest> {
  const [storedQuest, tasks, milestones] = await Promise.all([
    getQuest(actingUser, quest.id),
    readTasks(actingUser, quest.id),
    listMilestones(actingUser, quest.id, MILESTONES_IN_PROMPT),
  ]);
  return {
    name: quest.name,
    tasks: tasks ?? EMPTY_TASKS,
    milestones,
    status: storedQuest?.status,
  };
}

// The chat's quest as its prompt reads it.
async function promptQuest(
  actingUser: UserId,
  chat: Pick<Chat, "quest"> & { readonly id?: ChatId },
): Promise<PromptQuest> {
  let approval: Promise<StatusApproval | undefined> =
    Promise.resolve(undefined);
  if (chat.id !== undefined) {
    approval = readLatestStatusApproval(actingUser, chat.id);
  }
  const [quest, latestApproval] = await Promise.all([
    readPromptQuest(actingUser, chat.quest),
    approval,
  ]);
  return { ...quest, latestApproval };
}

async function buildReplyInstructions({
  actingUser,
  chat,
  construct,
  severalAuthors,
}: ReplyPromptRequest): Promise<SystemModelMessage[]> {
  const [quest, activeSpell, userName] = await Promise.all([
    promptQuest(actingUser, chat),
    readActiveSpell(actingUser, chat),
    readUserName(actingUser),
  ]);
  return renderReplyInstructions({
    quest,
    construct,
    activeSpell,
    userName,
    severalAuthors,
  });
}

export type { PromptQuest, ReplyPromptContext };
export { buildReplyInstructions, readPromptQuest, renderReplyInstructions };
