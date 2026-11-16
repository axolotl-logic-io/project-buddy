"use server";

import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/auth/current-user.ts";
import { getChat } from "@/chats/store.ts";
import { dayDate } from "@/dailies/dailies.ts";
import { startDay, undoStartDay } from "@/dailies/day-store.ts";
import { CHAT_ID } from "@/ids.ts";

// Starts a new day in the user's Dailies, dated by the browser's calendar
// (localDate) when it is believable, and opens the new conversation.
async function startDayAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = CHAT_ID.safeParse(formData.get("chatId"));
  if (!id.success) {
    notFound();
  }
  const conversation = await getChat(user.id, id.data);
  if (
    conversation === undefined ||
    (await startDay(user.id, id.data, {
      localDate: dayDate(formData.get("localDate"), new Date()),
      clearTasks: formData.get("clearTasks") === "on",
      clearIdeas: formData.get("clearIdeas") === "on",
    })) === undefined
  ) {
    notFound();
  }
  redirect(`/quests/${conversation.quest.id}?section=conversation`);
}

// Takes back the newest Start Day in the user's Dailies, until someone has
// sent a message in its conversation, and opens the conversation it puts
// back. Once someone has, it changes nothing and opens the quest again,
// which no longer offers Undo.
async function undoStartDayAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = CHAT_ID.safeParse(formData.get("chatId"));
  if (!id.success) {
    notFound();
  }
  const conversation = await getChat(user.id, id.data);
  if (conversation === undefined) {
    notFound();
  }
  await undoStartDay(user.id, id.data);
  redirect(`/quests/${conversation.quest.id}?section=conversation`);
}

export { startDayAction, undoStartDayAction };
