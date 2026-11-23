import {
  apiData,
  apiNotFound,
  apiProblem,
  type QuestCall,
  type QuestParams,
  questRoute,
  readApiBody,
} from "@/api/api-route.ts";
import { MURMLING_CHANGE } from "@/spaces/murmling.ts";
import {
  readSpaceContents,
  writeSpaceContents,
} from "@/spaces/murmling-store.ts";
import { SPACE_ID } from "@/spaces/space.ts";
import { SPACES_COPY } from "@/ui/copy/spaces.ts";

interface SpaceParams extends QuestParams {
  readonly spaceId: string;
}

export const GET = questRoute(
  async ({
    user,
    quest,
    params,
  }: QuestCall<SpaceParams>): Promise<Response> => {
    const spaceId = SPACE_ID.safeParse(params.spaceId).data;
    if (spaceId === undefined) {
      return apiNotFound();
    }
    const space = await readSpaceContents(user.id, quest.id, spaceId);
    if (space === undefined) {
      return apiNotFound();
    }
    return apiData(space);
  },
);

export const POST = questRoute(
  async ({
    user,
    quest,
    params,
    request,
  }: QuestCall<SpaceParams>): Promise<Response> => {
    const spaceId = SPACE_ID.safeParse(params.spaceId).data;
    if (spaceId === undefined) {
      return apiNotFound();
    }
    const change = await readApiBody(request, MURMLING_CHANGE);
    if (change instanceof Response) {
      return change;
    }
    const { result, space } = await writeSpaceContents(
      user.id,
      quest.id,
      spaceId,
      change,
    );
    if (result === "invalid-text") {
      return apiProblem(
        "invalid_input",
        SPACES_COPY.changeProblems[result],
        "text",
      );
    }
    if (result === "unchanged") {
      return apiProblem("conflict", SPACES_COPY.changeProblems[result]);
    }
    if (space === undefined) {
      return apiNotFound();
    }
    return apiData(space);
  },
);
