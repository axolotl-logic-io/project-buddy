"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import type { QuestActionResult } from "@/components/use-quest-action.ts";
import { DEFAULT_CONSTRUCT_ID, getConstruct } from "@/constructs/index.ts";
import {
  findConversation,
  findOrCreateConversation,
} from "@/conversations/conversation-store.ts";
import { dayDate } from "@/dailies/dailies.ts";
import { startDay, undoStartDay } from "@/dailies/day-store.ts";
import { CHAT_ID, QUEST_ID } from "@/ids.ts";
import { getQuest } from "@/quests/store.ts";
import { PANEL_COMMANDS_COPY } from "@/ui/copy/commands.ts";

const DAY_REQUEST = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("start"),
    questId: QUEST_ID,
    chatId: CHAT_ID.optional(),
    localDate: z.string().max(10),
    clearTasks: z.boolean(),
    clearIdeas: z.boolean(),
  }),
  z.object({ op: z.literal("undo"), questId: QUEST_ID, chatId: CHAT_ID }),
]);

async function changeDayAction(request: unknown): Promise<QuestActionResult> {
  const user = await requireUser();
  const change = DAY_REQUEST.safeParse(request).data;
  const quest = await getQuest(user.id, change?.questId ?? "");
  const { problems, notes } = PANEL_COMMANDS_COPY;
  if (
    change === undefined ||
    quest?.dailies !== true ||
    quest.status !== "active"
  ) {
    return { kind: "problem", text: problems.notDailies };
  }
  const current = await findConversation(user.id, quest.id);
  if (current?.id !== change.chatId) {
    refresh();
    return { kind: "problem", text: problems.dayChanged };
  }
  if (change.op === "undo") {
    const restored = await undoStartDay(user.id, change.chatId);
    refresh();
    if (restored === undefined) {
      return { kind: "problem", text: problems.cantUndoStartDay };
    }
    return { kind: "saved", message: notes.undoStartDay };
  }
  let { chatId } = change;
  if (chatId === undefined) {
    const found = await findOrCreateConversation(user.id, quest, {
      construct: getConstruct(DEFAULT_CONSTRUCT_ID),
    });
    chatId = found?.conversation.id;
  }
  if (chatId === undefined) {
    return { kind: "problem", text: problems.notDailies };
  }
  const { clearIdeas, clearTasks, localDate } = change;
  const started = await startDay(user.id, chatId, {
    localDate: dayDate(localDate, new Date()),
    clearIdeas,
    clearTasks,
  });
  refresh();
  if (started === undefined) {
    return { kind: "problem", text: problems.notDailies };
  }
  const cleared: string[] = [];
  if (clearTasks) {
    cleared.push(PANEL_COMMANDS_COPY.clearedTasks);
  }
  if (clearIdeas) {
    cleared.push(PANEL_COMMANDS_COPY.clearedIdeas);
  }
  return { kind: "saved", message: notes.startDay(cleared) };
}

export { changeDayAction };
