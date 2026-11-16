import { z } from "zod";
import {
  apiNotFound,
  type QuestCall,
  type QuestParams,
  questRoute,
  readApiBody,
} from "@/api/api-route.ts";
import { tasksAnswer, tasksItems } from "@/api/tasks-answer.ts";
import { TASKS_OPERATION } from "@/tasks/tasks.ts";
import { changeTasks, readTasksState } from "@/tasks/tasks-store.ts";

// The most operations one request may make, as many as the site's.
const MOST_OPERATIONS = 40;

const CHANGE_BODY = z.object({
  operations: z.array(TASKS_OPERATION).min(1).max(MOST_OPERATIONS),
});

// The quest's steps in saved order, with the Tasks version.
export const GET = questRoute(
  async ({ user, quest }: QuestCall<QuestParams>): Promise<Response> => {
    const state = await readTasksState(user.id, quest.id);
    if (state === undefined) {
      return apiNotFound();
    }
    return tasksItems(state);
  },
);

// Changes the steps as the quest's page does, all operations or none, saved
// in Tasks history so they can be undone.
export const POST = questRoute(
  async ({
    user,
    request,
    quest,
  }: QuestCall<QuestParams>): Promise<Response> => {
    const body = await readApiBody(request, CHANGE_BODY);
    if (body instanceof Response) {
      return body;
    }
    return tasksAnswer(
      await changeTasks(
        user.id,
        { questId: quest.id, author: "person" },
        body.operations,
      ),
    );
  },
);
