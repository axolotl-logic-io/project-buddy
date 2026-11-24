import {
  apiItems,
  type QuestCall,
  type QuestParams,
  questRoute,
} from "@/api/api-route.ts";
import { readLists } from "@/lists/list-store.ts";

export const GET = questRoute(
  async ({ user, quest }: QuestCall<QuestParams>): Promise<Response> =>
    apiItems(await readLists(user.id, quest.id)),
);
