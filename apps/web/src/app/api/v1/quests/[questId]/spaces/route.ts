import {
  apiItems,
  type QuestCall,
  type QuestParams,
  questRoute,
} from "@/api/api-route.ts";
import { listSpaces } from "@/spaces/space-store.ts";

export const GET = questRoute(
  async ({ user, quest }: QuestCall<QuestParams>): Promise<Response> =>
    apiItems(await listSpaces(user.id, quest.id)),
);
