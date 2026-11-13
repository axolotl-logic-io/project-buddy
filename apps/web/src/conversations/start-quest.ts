import { readUserName } from "@/accounts/users-store.ts";
import type { ChatQuest, QuestChat } from "@/chats/chat-rows.ts";
import {
  createQuestWithChat,
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
import type { QuestId, UserId } from "@/ids.ts";
import { EMPTY_PLAN } from "@/plan/plan.ts";
import type { QuestName } from "@/quests/quest-name.ts";
import { getQuest } from "@/quests/store.ts";
import { checkGold } from "@/quota/quota.ts";
import { chatOpening } from "@/replies/chat-opening.ts";
import { type PromptQuest, readPromptQuest } from "@/replies/system-prompt.ts";

const CLAUDE_UNAVAILABLE = { kind: "claudeUnavailable" } as const;
const OUT_OF_GOLD = { kind: "outOfGold" } as const;
const NOT_FOUND = { kind: "notFound" } as const;

// A new quest, saved with its conversation and opening, or why nothing was
// saved: Claude is unavailable to write the opening, or the owner is out of
// batteries.
type StartQuestResult =
  | { readonly kind: "started"; readonly chat: QuestChat }
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

function defaultStart(): {
  readonly construct: NewChatConstruct;
} {
  return {
    construct: getConstruct(DEFAULT_CONSTRUCT_ID),
  };
}

function openingFor(
  owner: UserId,
  readQuest: () => Promise<PromptQuest | undefined>,
  {
    construct,
  }: {
    readonly construct: ConstructSnapshot;
  },
): ReturnType<typeof chatOpening> {
  return chatOpening({
    construct,
    context: async () => {
      const [userName, quest] = await Promise.all([
        readUserName(owner),
        readQuest(),
      ]);
      return { quest, userName };
    },
  });
}

async function startNewQuest(
  owner: UserId,
  name: QuestName,
  construct: NewChatConstruct,
  {
    motivation = "",
    context = "",
    dailies = false,
    transaction,
  }: {
    readonly transaction?: Transaction;
    readonly motivation?: string;
    readonly context?: string;
    readonly dailies?: boolean;
  } = {},
): Promise<StartQuestResult | undefined> {
  const gold = await checkGold(owner);
  if (gold.kind === "outOfGold") {
    return OUT_OF_GOLD;
  }
  const initialContext = [context, motivation]
    .filter((text) => text !== "")
    .join("\n\n");
  const opening = await openingFor(
    owner,
    () =>
      Promise.resolve({
        name,
        startingContext: initialContext,
        plan: EMPTY_PLAN,
        milestones: [],
      }),
    { construct },
  );
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  const chat = await createQuestWithChat(
    owner,
    name,
    { construct, opening, context: initialContext, dailies },
    transaction,
  );
  if (chat === undefined) {
    return undefined;
  }
  return { kind: "started", chat };
}

// A new quest of the owner's named name, with its conversation, as
// startNewQuest starts it. A storage failure throws.
async function startQuest(
  owner: UserId,
  name: QuestName,
  construct: NewChatConstruct,
  options: Omit<Parameters<typeof startNewQuest>[3], "dailies"> = {},
): Promise<StartQuestResult> {
  const started = await startNewQuest(owner, name, construct, options);
  if (started === undefined) {
    throw new Error("A quest that isn't Dailies was refused as a duplicate");
  }
  return started;
}

// The quest's conversation as the viewer reads it, or undefined if it has
// none yet or the quest isn't open to them. Reading never starts one, so it
// writes nothing and spends no batteries.
function readQuestConversation(
  viewer: UserId,
  questId: QuestId,
): Promise<Conversation | undefined> {
  return findConversation(viewer, questId);
}

async function startQuestConversation(
  actingUser: UserId,
  questId: QuestId,
): Promise<StartConversationResult> {
  const quest = await getQuest(actingUser, questId);
  if (quest === undefined) {
    return NOT_FOUND;
  }
  const existing = await findConversation(actingUser, quest.id);
  if (existing !== undefined) {
    return { kind: "started", conversation: existing };
  }
  const gold = await checkGold(actingUser);
  if (gold.kind === "outOfGold") {
    return OUT_OF_GOLD;
  }
  const chatQuest: ChatQuest = { id: quest.id, name: quest.name };
  const start = defaultStart();
  const found = await findOrCreateConversation(actingUser, chatQuest, start);
  if (found === undefined) {
    return NOT_FOUND;
  }
  if (!found.created) {
    return { kind: "started", conversation: found.conversation };
  }
  const opening = await openingFor(
    actingUser,
    () => readPromptQuest(actingUser, quest),
    start,
  );
  if (opening === undefined) {
    return CLAUDE_UNAVAILABLE;
  }
  await appendConstructMessage(actingUser, found.conversation.id, opening);
  return { kind: "started", conversation: found.conversation };
}

export type { StartConversationResult, StartQuestResult };
export {
  defaultStart,
  readQuestConversation,
  startNewQuest,
  startQuest,
  startQuestConversation,
};
