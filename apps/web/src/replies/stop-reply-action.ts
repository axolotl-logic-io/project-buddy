"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { CHAT_ID, MESSAGE_ID } from "@/ids.ts";
import { stopReply } from "@/replies/reply-runs.ts";

const STOP = z.object({ chatId: CHAT_ID, messageId: MESSAGE_ID });

export async function stopReplyAction(
  input: unknown,
): Promise<Awaited<ReturnType<typeof stopReply>>> {
  const user = await requireUser();
  const request = STOP.parse(input);
  const status = await stopReply(user.id, request.chatId, request.messageId);
  revalidatePath(`/chats/${request.chatId}`);
  return status;
}
