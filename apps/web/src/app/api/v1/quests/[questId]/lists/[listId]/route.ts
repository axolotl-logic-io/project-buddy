import {
  apiData,
  apiNotFound,
  apiProblem,
  type QuestCall,
  type QuestParams,
  questRoute,
  readApiBody,
} from "@/api/api-route.ts";
import { LIST_ID } from "@/lists/list.ts";
import { LIST_ITEM_CHANGE } from "@/lists/list-item.ts";
import {
  readListContents,
  writeListContents,
} from "@/lists/list-item-store.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";

interface ListParams extends QuestParams {
  readonly listId: string;
}

export const GET = questRoute(
  async ({ user, quest, params }: QuestCall<ListParams>): Promise<Response> => {
    const listId = LIST_ID.safeParse(params.listId).data;
    if (listId === undefined) {
      return apiNotFound();
    }
    const list = await readListContents(user.id, quest.id, listId);
    if (list === undefined) {
      return apiNotFound();
    }
    return apiData(list);
  },
);

export const POST = questRoute(
  async ({
    user,
    quest,
    params,
    request,
  }: QuestCall<ListParams>): Promise<Response> => {
    const listId = LIST_ID.safeParse(params.listId).data;
    if (listId === undefined) {
      return apiNotFound();
    }
    const change = await readApiBody(request, LIST_ITEM_CHANGE);
    if (change instanceof Response) {
      return change;
    }
    const { result, list } = await writeListContents(
      user.id,
      quest.id,
      listId,
      change,
    );
    if (result === "invalid-text") {
      return apiProblem(
        "invalid_input",
        LISTS_COPY.changeProblems[result],
        "text",
      );
    }
    if (result === "unchanged") {
      return apiProblem("conflict", LISTS_COPY.changeProblems[result]);
    }
    if (list === undefined) {
      return apiNotFound();
    }
    return apiData(list);
  },
);
