import { and, eq } from "drizzle-orm";
import { questOwnedBy } from "@/accounts/owner-scope.ts";
import { isQuestChat, type QuestChat } from "@/chats/chat-rows.ts";
import type { NewChatConstruct } from "@/chats/new-chat-store.ts";
import {
  startNewQuest,
  startQuestConversation,
} from "@/conversations/start-quest.ts";
import { getDb } from "@/db/client.ts";
import { quests } from "@/db/tables/quests-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseQuestId, type QuestId, type UserId } from "@/ids.ts";
import type { QuestName } from "@/quests/quest-name.ts";

// The user's Dailies, newly started or resumed as it was, with its
// conversation, or why its opening was unavailable.
type StartDailiesResult =
  | {
      readonly kind: "started" | "resumed";
      readonly chat: QuestChat;
    }
  | { readonly kind: "claudeUnavailable" };

interface DailiesStart {
  readonly name: QuestName;
  readonly context: string;
  readonly motivation?: string;
  readonly construct: NewChatConstruct;
}

// The id of the user's own Dailies; undefined if they have none.
async function dailiesId(user: UserId): Promise<QuestId | undefined> {
  const [row] = await withAppErrors("dailiesId", () =>
    getDb()
      .select({ id: quests.id })
      .from(quests)
      .where(and(eq(quests.dailies, true), questOwnedBy(user))),
  );
  return parseQuestId(row?.id ?? "");
}

// The user's Dailies resumed: its conversation as it is, or, for one left
// without a conversation, a new one started.
async function resume(
  user: UserId,
  questId: QuestId,
): Promise<StartDailiesResult> {
  const started = await startQuestConversation(user, questId);
  if (started.kind === "notFound") {
    throw new Error("The user's Dailies is not open to them");
  }
  if (started.kind !== "started") {
    return started;
  }
  const { conversation } = started;
  if (!isQuestChat(conversation)) {
    throw new Error("A Dailies conversation has no quest");
  }
  return { kind: "resumed", chat: conversation };
}

// The user's Dailies: resumed as it is when they have one, which changes
// nothing, writes nothing; otherwise started from
// start, like any new quest. A storage failure throws.
async function startDailies(
  user: UserId,
  start: DailiesStart,
): Promise<StartDailiesResult> {
  const existing = await dailiesId(user);
  if (existing !== undefined) {
    return await resume(user, existing);
  }
  const started = await startNewQuest(user, start.name, start.construct, {
    context: start.context,
    motivation: start.motivation ?? "",
    dailies: true,
  });
  if (started !== undefined) {
    return started;
  }
  const made = await dailiesId(user);
  if (made === undefined) {
    throw new Error("A Dailies was refused as a duplicate, yet none exists");
  }
  return await resume(user, made);
}

export type { DailiesStart, StartDailiesResult };
export { startDailies };
