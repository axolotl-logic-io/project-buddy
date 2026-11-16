import { z } from "zod";
import {
  apiItems,
  apiProblem,
  parseApiInput,
  type QuestCall,
  type QuestParams,
  questRoute,
  readApiBody,
} from "@/api/api-route.ts";
import { IDEA_REQUEST } from "@/ideas/idea.ts";
import { changeIdea, listIdeas } from "@/ideas/idea-store.ts";

// The quest's ideas in saved order.
export const GET = questRoute(
  async ({ user, quest }: QuestCall<QuestParams>): Promise<Response> =>
    apiItems(await listIdeas(user.id, quest.id)),
);

// Changes the quest's ideas, as the site's Ideas panel does: `op` is add,
// edit, reorder, remove, or move, which moves an idea to Tasks in one
// change. Answers with the ideas after it.
export const POST = questRoute(
  async ({
    user,
    request,
    quest,
  }: QuestCall<QuestParams>): Promise<Response> => {
    const body = await readApiBody(request, z.looseObject({}));
    if (body instanceof Response) {
      return body;
    }
    const change = parseApiInput(IDEA_REQUEST, { ...body, questId: quest.id });
    if (change instanceof Response) {
      return change;
    }
    const result = await changeIdea(user.id, change);
    if (result.kind === "problem") {
      switch (result.reason) {
        case "not-found":
          return apiProblem("not_found", result.text, "id");
        case "tasks-full":
          return apiProblem("conflict", result.text);
        case "invalid":
          return apiProblem("invalid_input", result.text);
        default:
          return result.reason satisfies never;
      }
    }
    return apiItems(await listIdeas(user.id, quest.id));
  },
);
