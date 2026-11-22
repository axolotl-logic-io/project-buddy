import { z } from "zod";
import {
  apiData,
  apiItems,
  apiNotFound,
  type QuestCall,
  type QuestParams,
  questRoute,
  readApiBody,
} from "@/api/api-route.ts";
import {
  listPerformances,
  startPerformance,
} from "@/performances/performance-store.ts";
import { SPACE_ID } from "@/spaces/space.ts";

const START = z.object({ riteId: z.string().min(1), spaceId: SPACE_ID });

export const GET = questRoute(
  async ({ user, quest }: QuestCall<QuestParams>): Promise<Response> =>
    apiItems(await listPerformances(user.id, quest.id)),
);

export const POST = questRoute(
  async ({
    user,
    quest,
    request,
  }: QuestCall<QuestParams>): Promise<Response> => {
    const input = await readApiBody(request, START);
    if (input instanceof Response) {
      return input;
    }
    const performance = await startPerformance(user.id, quest.id, input);
    if (performance === undefined) {
      return apiNotFound();
    }
    return apiData(performance);
  },
);
