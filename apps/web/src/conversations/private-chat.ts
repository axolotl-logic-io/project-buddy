// The user's private Chat: one continuing conversation for talking without
// a goal, open to that user alone. It has no quest, so the construct has no
// Plan or Progress to read or write in it.
import {
  type Conversation,
  findOrCreateConversation,
} from "@/conversations/conversation-store.ts";
import { defaultStart } from "@/conversations/start-quest.ts";
import type { UserId } from "@/ids.ts";

// The user's private Chat, made empty, in the default construct and the open
// chat, the first time it is asked for: of concurrent calls, exactly one
// makes it. It has no opening, so reading it calls no model and spends no
// batteries. A user who no longer exists is not found, which throws.
async function privateChat(user: UserId): Promise<Conversation> {
  const found = await findOrCreateConversation(user, undefined, defaultStart());
  if (found === undefined) {
    throw new Error("No such user to chat with");
  }
  return found.conversation;
}

export { privateChat };
