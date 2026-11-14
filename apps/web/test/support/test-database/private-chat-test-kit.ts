// A user's private Chat, as the site made it before quests held every
// conversation: one continuing conversation in no quest, open to that user
// alone. The site still opens and answers the ones it made; tests make them
// here.
import {
  type Conversation,
  findOrCreateConversation,
} from "@/conversations/conversation-store.ts";
import { defaultStart } from "@/conversations/start-quest.ts";
import type { UserId } from "@/ids.ts";

// The user's private Chat, made empty in the default construct the first
// time it is asked for: of concurrent calls, exactly one makes it.
async function privateChat(user: UserId): Promise<Conversation> {
  const found = await findOrCreateConversation(user, undefined, defaultStart());
  if (found === undefined) {
    throw new Error("No such user to chat with");
  }
  return found.conversation;
}

export { privateChat };
