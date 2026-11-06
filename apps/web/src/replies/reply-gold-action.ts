"use server";

import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { getChat } from "@/chats/store.ts";
import { wholeGold } from "@/gold/gold.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import { CHAT_ID, MESSAGE_ID } from "@/ids.ts";
import { type ReplyCost, readReplyCosts } from "@/replies/reply-accounting.ts";

export async function replyGoldAction(
  id: unknown,
  visibleMessages: unknown,
): Promise<
  | {
      readonly viewer: string;
      readonly balance: number;
      readonly costs: ReplyCost[];
    }
  | undefined
> {
  const ids = z.array(MESSAGE_ID).parse(visibleMessages);
  const user = await requireUser();
  const chatId = CHAT_ID.parse(id);
  if ((await getChat(user.id, chatId)) === undefined) {
    return undefined;
  }
  const [balance, costs] = await Promise.all([
    readGoldBalance(user.id),
    readReplyCosts(user.id, chatId),
  ]);
  return {
    viewer: user.id,
    balance: wholeGold(balance),
    costs: costs.filter((cost) =>
      ids.some((messageId) => messageId === cost.messageId),
    ),
  };
}
