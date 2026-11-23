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
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { getQuest, renameQuest } from "@/quests/store.ts";

const RENAME_BODY = z.object({ name: QUEST_NAME });

export const GET = questRoute(
  ({ quest }: QuestCall<QuestParams>): Promise<Response> =>
    Promise.resolve(apiData(questView(quest))),
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
