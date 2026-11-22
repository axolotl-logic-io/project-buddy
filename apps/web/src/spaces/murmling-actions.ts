"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { AppError } from "@/errors/app-error.ts";
import { QUEST_ID } from "@/ids.ts";
import { SPACES_COPY } from "@/ui/copy/spaces.ts";
import { MURMLING_CHANGE } from "./murmling.ts";
import { changeMurmling } from "./murmling-store.ts";
import { SPACE_ID } from "./space.ts";

const REQUEST = z.object({
  questId: QUEST_ID,
  spaceId: SPACE_ID,
  change: MURMLING_CHANGE,
});

async function changeMurmlingAction(
  request: unknown,
): Promise<string | undefined> {
  const user = await requireUser();
  const input = REQUEST.safeParse(request);
  if (!input.success) {
    return SPACES_COPY.invalidChange;
  }
  try {
    const { questId, spaceId, change } = input.data;
    const result = await changeMurmling(user.id, questId, spaceId, change);
    if (result === "saved") {
      refresh();
      return undefined;
    }
    return SPACES_COPY.changeProblems[result];
  } catch (error) {
    if (error instanceof AppError) {
      return error.message;
    }
    throw error;
  }
}

export { changeMurmlingAction };
