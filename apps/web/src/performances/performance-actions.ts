"use server";

import { z } from "zod";
import { currentUser, requireUser } from "@/auth/current-user.ts";
import { AppError } from "@/errors/app-error.ts";
import { PERFORMANCE_ID, QUEST_ID } from "@/ids.ts";
import { LIST_ID } from "@/lists/list.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import {
  PERFORMANCE_MESSAGE,
  sendMessage,
  startPerformance,
  stopPerformance,
} from "./performance-store.ts";

const START_INPUT = z.object({
  id: PERFORMANCE_ID,
  questId: QUEST_ID,
  listId: LIST_ID,
  riteId: z.string().min(1),
});
const STOP_INPUT = z.object({
  questId: QUEST_ID,
  performanceId: PERFORMANCE_ID,
});
const SEND_MESSAGE_INPUT = PERFORMANCE_MESSAGE.extend({ questId: QUEST_ID });

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
  return undefined;
}

async function sendMessageAction(
  request: unknown,
): Promise<string | undefined> {
  const user = await currentUser();
  if (user === undefined) {
    return PERFORMANCE_COPY.signedOut;
  }
  const input = SEND_MESSAGE_INPUT.safeParse(request).data;
  if (input === undefined) {
    return PERFORMANCE_COPY.required;
  }
  try {
    if ((await sendMessage(user.id, input.questId, input)) === undefined) {
      return PERFORMANCE_COPY.required;
    }
    return undefined;
  } catch (error) {
    if (error instanceof AppError) {
      return error.message;
    }
    throw error;
  }
}

export { sendMessageAction, startPerformanceAction, stopPerformanceAction };
