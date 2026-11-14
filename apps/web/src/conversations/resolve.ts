// Resolves an accessible conversation to its quest. Standalone conversations
// have no destination.
import { getChat } from "@/chats/store.ts";
import type { QuestId, UserId } from "@/ids.ts";

interface ResolvedConversation {
  readonly kind: "quest";
  readonly questId: QuestId;
}

// Unknown, inaccessible and standalone conversations have no destination.
async function resolveConversation(
  viewer: UserId,
  id: string,
): Promise<ResolvedConversation | undefined> {
  const chat = await getChat(viewer, id);
  if (chat === undefined) {
    return undefined;
  }
  if (chat.quest === undefined) {
    return undefined;
  }
  return { kind: "quest", questId: chat.quest.id };
}

export type { ResolvedConversation };
export { resolveConversation };
