"use server";

import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { CHAT_ID, MESSAGE_ID } from "@/ids.ts";
import { stopReply } from "@/replies/reply-runs.ts";

const STOP = z.object({ chatId: CHAT_ID, messageId: MESSAGE_ID });

// Asks the reply the acting user's message is waiting for to stop, and says
// where it stands. The chat view refreshes whichever page shows the
// conversation, a quest's or Chat, once this answers.
export async function stopReplyAction(
  input: unknown,
): Promise<Awaited<ReturnType<typeof stopReply>>> {
  const user = await requireUser();
  const request = STOP.parse(input);
  return await stopReply(user.id, request.chatId, request.messageId);
}
