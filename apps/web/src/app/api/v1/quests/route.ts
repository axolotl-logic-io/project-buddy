import { z } from "zod";
import {
  type ApiCall,
  apiData,
  apiItems,
  apiRoute,
  type NoParams,
  parseApiInput,
  readApiBody,
} from "@/api/api-route.ts";
import { questView } from "@/api/api-views.ts";
import { QUEST_NAME } from "@/quests/quest-name.ts";
import { QUEST_STATUS } from "@/quests/quest-status.ts";
import { createQuest, listQuests } from "@/quests/store.ts";

const LIST_QUERY = z.object({ status: QUEST_STATUS.optional() });

// A start: the quest's name, and optionally the user's Why, which its
// construct reads as the quest's starting context.
const START_BODY = z.object({
  name: QUEST_NAME,
  why: z.string().trim().default(""),
});

// The quests open to the user, Life among them, newest first, optionally
// only those with one status.
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

// Starts a new quest, as the site's New quest form does.
export const POST = apiRoute(
  async ({ user, request }: ApiCall<NoParams>): Promise<Response> => {
    const body = await readApiBody(request, START_BODY);
    if (body instanceof Response) {
      return body;
    }
    const quest = await createQuest(user.id, body.name, {
      startingContext: body.why,
    });
    return apiData(questView(quest));
  },
);
