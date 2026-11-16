import {
  apiItems,
  type QuestCall,
  type QuestParams,
  questRoute,
} from "@/api/api-route.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";

// The quest's milestones, newest first: its progress timeline.
export const GET = questRoute(
  async ({ user, quest }: QuestCall<QuestParams>): Promise<Response> =>
    apiItems(await listMilestones(user.id, quest.id)),
);
