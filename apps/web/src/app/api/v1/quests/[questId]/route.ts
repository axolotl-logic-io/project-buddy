import { z } from "zod";
import {
  apiData,
  apiNotFound,
  type QuestCall,
  type QuestParams,
  questRoute,
  readApiBody,
} from "@/api/api-route.ts";
import { questView } from "@/api/api-views.ts";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { getQuest, renameQuest } from "@/quests/store.ts";

const RENAME_BODY = z.object({ name: QUEST_NAME });

// The quest, with its status revision and its conversation's id, or null
// when it has none yet.
export const GET = questRoute(
  async ({ user, quest }: QuestCall<QuestParams>): Promise<Response> => {
    const conversation = await readQuestConversation(user.id, quest.id);
    return apiData({
      ...questView(quest),
      conversationId: conversation?.id ?? null,
    });
  },
);

// Renames the quest, with the site's quest-name rules.
export const PATCH = questRoute(
  async ({
    user,
    request,
    quest,
  }: QuestCall<QuestParams>): Promise<Response> => {
    const body = await readApiBody(request, RENAME_BODY);
    if (body instanceof Response) {
      return body;
    }
    if (!(await renameQuest(user.id, quest.id, body.name))) {
      return apiNotFound();
    }
    const renamed = await getQuest(user.id, quest.id);
    if (renamed === undefined) {
      return apiNotFound();
    }
    return apiData(questView(renamed));
  },
);
