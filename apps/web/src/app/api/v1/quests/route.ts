import { z } from "zod";
import {
  type ApiCall,
  apiData,
  apiItems,
  apiProblem,
  apiRoute,
  type NoParams,
  parseApiInput,
  readApiBody,
} from "@/api/api-route.ts";
import { questView } from "@/api/api-views.ts";
import { startPremadeQuest } from "@/conversations/start-premade-quest.ts";
import { PREMADE_QUEST_ID, PREMADE_QUESTS } from "@/quests/premade-quests.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { QUEST_STATUS } from "@/quests/quest-status.ts";
import { getQuest, listQuests } from "@/quests/store.ts";
import { OPENING_COPY } from "@/ui/copy/chat.ts";

const LIST_QUERY = z.object({ status: QUEST_STATUS.optional() });

// A start: the starting point, and optionally the quest's name (the
// starting point's by default), the user's Why and starting context.
const START_BODY = z.object({
  from: PREMADE_QUEST_ID,
  name: QUEST_NAME.optional(),
  why: z.string().trim().default(""),
  context: z.string().trim().optional(),
});

// The quests open to the user, newest first, optionally only those with
// one status.
export const GET = apiRoute(
  async ({ user, request }: ApiCall<NoParams>): Promise<Response> => {
    const { searchParams } = new URL(request.url);
    const query = parseApiInput(LIST_QUERY, Object.fromEntries(searchParams));
    if (query instanceof Response) {
      return query;
    }
    const quests = await listQuests(user.id);
    return apiItems(
      quests
        .filter(
          ({ status }) => query.status === undefined || status === query.status,
        )
        .map(questView),
    );
  },
);

// Starts a quest from a starting point, as the site's start form does:
// Dailies resumes the user's own Dailies when they have one.
export const POST = apiRoute(
  async ({ user, request }: ApiCall<NoParams>): Promise<Response> => {
    const body = await readApiBody(request, START_BODY);
    if (body instanceof Response) {
      return body;
    }
    const premade = PREMADE_QUESTS.find(({ id }) => id === body.from);
    if (premade === undefined) {
      return apiProblem("invalid_input", "No such starting point.", "from");
    }
    const started = await startPremadeQuest(user.id, {
      premadeId: premade.id,
      name: body.name ?? QUEST_NAME.parse(premade.name),
      context: body.context ?? premade.context,
      motivation: body.why,
    });
    if (started.kind === "claudeUnavailable") {
      return apiProblem("reply_failed", OPENING_COPY.claudeUnavailable);
    }
    const quest = await getQuest(user.id, started.chat.quest.id);
    if (quest === undefined) {
      return apiProblem(
        "not_found",
        "The quest was started but can't be read.",
      );
    }
    return apiData({
      ...questView(quest),
      conversationId: started.chat.id,
      resumed: started.kind === "resumed",
    });
  },
);
