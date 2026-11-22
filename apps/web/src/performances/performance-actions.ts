"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { QUEST_ID } from "@/ids.ts";
import { SPACE_ID } from "@/spaces/space.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import {
  CONJURATION,
  conjure,
  PERFORMANCE_ID,
  startPerformance,
  stopPerformance,
} from "./performance-store.ts";

const START_INPUT = z.object({
  questId: QUEST_ID,
  spaceId: SPACE_ID,
  riteId: z.string().min(1),
});
const STOP_INPUT = z.object({
  questId: QUEST_ID,
  performanceId: PERFORMANCE_ID,
});
const CONJURE_INPUT = CONJURATION.extend({ questId: QUEST_ID });

async function startPerformanceAction(
  request: unknown,
): Promise<typeof PERFORMANCE_COPY.unavailable | undefined> {
  const user = await requireUser();
  const input = START_INPUT.safeParse(request).data;
  if (
    input === undefined ||
    (await startPerformance(user.id, input.questId, input)) === undefined
  ) {
    return PERFORMANCE_COPY.unavailable;
  }
  refresh();
  return undefined;
}

async function stopPerformanceAction(
  request: unknown,
): Promise<typeof PERFORMANCE_COPY.unavailable | undefined> {
  const user = await requireUser();
  const input = STOP_INPUT.safeParse(request).data;
  if (
    input === undefined ||
    !(await stopPerformance(user.id, input.questId, input.performanceId))
  ) {
    return PERFORMANCE_COPY.unavailable;
  }
  refresh();
  return undefined;
}

async function conjureAction(
  request: unknown,
): Promise<typeof PERFORMANCE_COPY.required | undefined> {
  const user = await requireUser();
  const input = CONJURE_INPUT.safeParse(request).data;
  if (
    input === undefined ||
    (await conjure(user.id, input.questId, input)) === undefined
  ) {
    return PERFORMANCE_COPY.required;
  }
  refresh();
  return undefined;
}

export { conjureAction, startPerformanceAction, stopPerformanceAction };
