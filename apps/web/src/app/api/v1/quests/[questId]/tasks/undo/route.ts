import { z } from "zod";
import {
  type QuestCall,
  type QuestParams,
  questRoute,
  readApiBody,
} from "@/api/api-route.ts";
import { tasksAnswer } from "@/api/tasks-answer.ts";
import { undoTasksChange } from "@/tasks/tasks-store.ts";

const UNDO_BODY = z.object({ version: z.number().int().positive() });

// Undoes the change saved as this version, by anyone, with the Tasks
// history's undo rules.
export const POST = questRoute(
  async ({
    user,
    request,
    quest,
  }: QuestCall<QuestParams>): Promise<Response> => {
    const body = await readApiBody(request, UNDO_BODY);
    if (body instanceof Response) {
      return body;
    }
    return tasksAnswer(
      await undoTasksChange(
        user.id,
        { questId: quest.id, author: "person" },
        body.version,
      ),
    );
  },
);
