import {
  apiData,
  apiProblem,
  type QuestCall,
  type QuestParams,
  questRoute,
} from "@/api/api-route.ts";
import { conversationView } from "@/api/api-views.ts";
import { chatAwaitsReply, listMessages } from "@/chats/store.ts";
import { readQuestConversation } from "@/conversations/start-quest.ts";

const NO_CONVERSATION =
  "This quest has no spell conversation yet. Cast a spell to open one.";

// The quest's conversation as people see it: its messages in conversation
// order, its active spell and whether its newest message awaits a reply.
export const GET = questRoute(
  async ({ user, quest }: QuestCall<QuestParams>): Promise<Response> => {
    const conversation = await readQuestConversation(user.id, quest.id);
    if (conversation === undefined) {
      return apiProblem("not_found", NO_CONVERSATION);
    }
    if (conversation.spellStartedAt === undefined) {
      return apiProblem("spell_required", NO_CONVERSATION);
    }
    const [messages, awaitingReply] = await Promise.all([
      listMessages(user.id, conversation.id, conversation.spellStartedAt),
      chatAwaitsReply(user.id, conversation.id, conversation.spellStartedAt),
    ]);
    return apiData(conversationView(conversation, { messages, awaitingReply }));
  },
);
