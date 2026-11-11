// Starting a quest, and its conversation: the one place a user works on a
// goal. A new quest is saved with its conversation and the construct's
// opening (src/replies/chat-opening.ts) in one transaction, so the user finds
// the construct already speaking, and no quest is left without its
// conversation. A built-in construct in a built-in activity has a prepared
// opening, which takes no model call; otherwise the construct writes it, up
// to the opening's timeout, and when Claude can't, nothing is saved. Once the
// acting user is out of batteries (src/quota/quota.ts), nothing is saved
// either. Reading a quest's conversation never starts one: only an explicit
// start does, and it spends batteries only on an opening it writes.
import { readUserName } from "@/accounts/users-store.ts";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { activityChoices } from "@/activities/activity-choices.ts";
import {
  builtInActivity,
  type ChatActivity,
} from "@/activities/chosen-activity.ts";
import { motivatedOpeningRequest } from "@/activities/index.ts";
import type { ChatProject, ProjectChat } from "@/chats/chat-rows.ts";
import {
  createProjectWithChat,
  type NewChatConstruct,
} from "@/chats/new-chat-store.ts";
import {
  type ConstructSnapshot,
  DEFAULT_CONSTRUCT_ID,
  getConstruct,
} from "@/constructs/index.ts";
import {
  appendConstructMessage,
  type Conversation,
  findConversation,
  findOrCreateConversation,
} from "@/conversations/conversation-store.ts";
import type { Transaction } from "@/db/client.ts";
import type { ProjectId, UserId } from "@/ids.ts";
import { EMPTY_MEMORY, MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { EMPTY_PLAN } from "@/plan/plan.ts";
import type { PremadeId } from "@/projects/premade.ts";
import type { ProjectName } from "@/projects/project-name.ts";
import { getProject } from "@/projects/store.ts";
import { checkGold, type QuotaGrant } from "@/quota/quota.ts";
import { chatOpening } from "@/replies/chat-opening.ts";
import {
  type PromptProject,
  readPromptProject,
} from "@/replies/system-prompt.ts";
import { spellChoices } from "@/spells/spell-choices.ts";

const CLAUDE_UNAVAILABLE = { kind: "claudeUnavailable" } as const;
const OUT_OF_GOLD = { kind: "outOfGold" } as const;
const NOT_FOUND = { kind: "notFound" } as const;

// A new quest, saved with its conversation and opening, or why nothing was
// saved: Claude is unavailable to write the opening, or the owner is out of
// batteries.
type StartProjectResult =
  | { readonly kind: "started"; readonly chat: ProjectChat }
  | typeof CLAUDE_UNAVAILABLE
  | typeof OUT_OF_GOLD;

// A quest's conversation, found or started, or why it wasn't: the quest
// isn't open to the acting user, they are out of batteries, or Claude
// couldn't write the opening of the conversation this call made, which is
// then saved empty, for the user to write in first.
type StartConversationResult =
  | { readonly kind: "started"; readonly conversation: Conversation }
  | typeof CLAUDE_UNAVAILABLE
  | typeof OUT_OF_GOLD
  | typeof NOT_FOUND;

// The construct and activity a conversation starts in when no one chose
// them: the default construct, in the open chat.
function defaultStart(): {
  readonly construct: NewChatConstruct;
  readonly activity: ChatActivity;
} {
  return {
    construct: getConstruct(DEFAULT_CONSTRUCT_ID),
    activity: builtInActivity(DEFAULT_ACTIVITY_ID),
  };
}

// The opening of a conversation of the owner's in a quest, with the quest as
// readProject reads it, or in none, in construct and activity, as kickoff asks
// for it if given, charged to grant if the construct writes it; undefined when
// Claude can't write it.
function openingFor(
  owner: UserId,
  grant: QuotaGrant,
  readProject: () => Promise<PromptProject | undefined>,
  {
    construct,
    activity,
    kickoff,
  }: {
    readonly construct: ConstructSnapshot;
    readonly activity: ChatActivity;
    readonly kickoff?: string | undefined;
  },
): ReturnType<typeof chatOpening> {
  return chatOpening({
    construct,
    activity,
    kickoff,
    grant,
    context: async () => {
      const [activities, spells, userName, project] = await Promise.all([
        activityChoices(owner),
        spellChoices(owner),
        readUserName(owner),
        readProject(),
      ]);
      return { activities, spells, project, userName };
    },
  });
}

// A new quest of the owner's named name, with its conversation in the
// construct, kept as it is now, and the chosen activity, opened as the
// activity asks, and seeded with the journal and the motivation in its
// Journal, from premade if given. A Dailies quest is saved only when the
// owner has none: with one already, the result is undefined and nothing is
// saved (src/conversations/dailies.ts). A storage failure throws.
async function startNewQuest(
  owner: UserId,
  name: ProjectName,
  construct: NewChatConstruct,
  {
    motivation = "",
    journal = "",
    activity = builtInActivity("project-breakdown"),
    premade,
    transaction,
  }: {
    readonly transaction?: Transaction;
    readonly motivation?: string | undefined;
    readonly journal?: string;
    readonly activity?: ChatActivity;
    readonly premade?: PremadeId | undefined;
  } = {},
): Promise<StartProjectResult | undefined> {
  const gold = await checkGold(owner);
  if (gold.kind === "outOfGold") {
    return OUT_OF_GOLD;
  }
  const initialJournal = [journal, motivation]
    .filter((text) => text !== "")
    .join("\n\n");
  let memory = EMPTY_MEMORY;
  let kickoff: string | undefined;
  if (motivation !== "") {
    kickoff = motivatedOpeningRequest(activity.definition.openingRequest);
  }
  if (initialJournal !== "") {
    memory = { text: initialJournal, version: MEMORY_VERSION_NUMBER.parse(1) };
  }
  const opening = await openingFor(
    owner,
    gold.grant,
    () => Promise.resolve({ name, memory, plan: EMPTY_PLAN, milestones: [] }),
    { construct, activity, kickoff },
  );
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  const chat = await createProjectWithChat(
    owner,
    name,
    { construct, activity, opening, journal: initialJournal, premade },
    transaction,
  );
  if (chat === undefined) {
    return undefined;
  }
  return { kind: "started", chat };
}

// A new quest of the owner's named name, with its conversation, as
// startNewQuest starts it. A storage failure throws.
async function startProject(
  owner: UserId,
  name: ProjectName,
  construct: NewChatConstruct,
  options: Parameters<typeof startNewQuest>[3] = {},
): Promise<StartProjectResult> {
  const started = await startNewQuest(owner, name, construct, options);
  if (started === undefined) {
    throw new Error("A quest was refused as a duplicate Dailies");
  }
  return started;
}

// The quest's conversation as the viewer reads it, or undefined if it has
// none yet or the quest isn't open to them. Reading never starts one, so it
// writes nothing and spends no batteries.
function readQuestConversation(
  viewer: UserId,
  projectId: ProjectId,
): Promise<Conversation | undefined> {
  return findConversation(viewer, projectId);
}

// The quest's conversation, started for the acting user if it has none, as
// after the removal of adventures (docs/design/simplification-892.md): in
// the default construct and the open chat, opened as that activity asks. Of
// concurrent starts, exactly one makes the conversation and writes its
// opening, charged to its acting user; the others return the same
// conversation, as does a start once the quest has one, for free.
async function startQuestConversation(
  actingUser: UserId,
  projectId: ProjectId,
): Promise<StartConversationResult> {
  const project = await getProject(actingUser, projectId);
  if (project === undefined) {
    return NOT_FOUND;
  }
  const existing = await findConversation(actingUser, project.id);
  if (existing !== undefined) {
    return { kind: "started", conversation: existing };
  }
  const gold = await checkGold(actingUser);
  if (gold.kind === "outOfGold") {
    return OUT_OF_GOLD;
  }
  const quest: ChatProject = { id: project.id, name: project.name };
  const start = defaultStart();
  const found = await findOrCreateConversation(actingUser, quest, start);
  if (found === undefined) {
    return NOT_FOUND;
  }
  if (!found.created) {
    return { kind: "started", conversation: found.conversation };
  }
  const opening = await openingFor(
    actingUser,
    gold.grant,
    () => readPromptProject(actingUser, quest),
    start,
  );
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  await appendConstructMessage(actingUser, found.conversation.id, opening);
  return { kind: "started", conversation: found.conversation };
}

export type { StartConversationResult, StartProjectResult };
export {
  defaultStart,
  openingFor,
  readQuestConversation,
  startNewQuest,
  startProject,
  startQuestConversation,
};
