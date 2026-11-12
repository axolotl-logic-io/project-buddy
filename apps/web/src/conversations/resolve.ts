// Where an old conversation link leads now: the conversation's quest, or the
// viewer's private Chat. Links to adventures, from emails and bookmarks made
// before quests had one conversation, resolve here, so an adapter route can
// send the viewer on without showing what the link held.
import { getChat } from "@/chats/store.ts";
import type { QuestId, UserId } from "@/ids.ts";

type ResolvedConversation =
  | { readonly kind: "quest"; readonly questId: QuestId }
  | { readonly kind: "chat" };

// Where the conversation with this id leads the viewer: its quest, or, for
// a conversation in no quest, their private Chat; undefined if the id is
// malformed, unknown, removed or not open to them.
async function resolveConversation(
  viewer: UserId,
  id: string,
): Promise<ResolvedConversation | undefined> {
  const chat = await getChat(viewer, id);
  if (chat === undefined) {
    return undefined;
  }
  if (chat.quest === undefined) {
    return { kind: "chat" };
  }
  return { kind: "quest", questId: chat.quest.id };
}

export type { ResolvedConversation };
export { resolveConversation };
