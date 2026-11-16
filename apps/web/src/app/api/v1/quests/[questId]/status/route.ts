import { z } from "zod";
import {
  apiData,
  apiNotFound,
  apiProblem,
  type QuestCall,
  type QuestParams,
  questRoute,
  readApiBody,
} from "@/api/api-route.ts";
import { questView } from "@/api/api-views.ts";
import { QUEST_STATUS, STATUS_REVISION } from "@/quests/quest-status.ts";
import { changeQuestStatus } from "@/quests/quest-status-store.ts";
import { getQuest } from "@/quests/store.ts";

// The status to change to, and the quest's status revision as the caller
// last read it.
const STATUS_BODY = z.object({
  status: QUEST_STATUS,
  revision: STATUS_REVISION,
});

const CONFLICT_MESSAGE =
  "The quest's status changed since you read it, or already is that status. Read the quest again.";

// Changes the quest's status directly, as the site's status controls do.
// A stale revision, or the status it already has, changes nothing.
export const POST = questRoute(
  async ({
    user,
    request,
    quest,
  }: QuestCall<QuestParams>): Promise<Response> => {
    const body = await readApiBody(request, STATUS_BODY);
    if (body instanceof Response) {
      return body;
    }
    const change = await changeQuestStatus(user.id, {
      questId: quest.id,
      fromStatus: quest.status,
      toStatus: body.status,
      revision: body.revision,
    });
    if (change === undefined) {
      return apiProblem("conflict", CONFLICT_MESSAGE, "revision");
    }
    const changed = await getQuest(user.id, quest.id);
    if (changed === undefined) {
      return apiNotFound();
    }
    return apiData(questView(changed));
  },
);
