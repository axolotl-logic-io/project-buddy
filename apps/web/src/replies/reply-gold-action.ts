"use server";

import { z } from "zod";
import { currentUser } from "@/auth/current-user.ts";
import { getChat } from "@/chats/store.ts";
import { wholeGold } from "@/gold/gold.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import { CHAT_ID, MESSAGE_ID } from "@/ids.ts";
import { type ReplyCost, readReplyCosts } from "@/replies/reply-accounting.ts";

// The viewer's batteries and the costs of the replies to their visible
// messages in an adventure, or undefined for an adventure they can't open.
// An open adventure reads this in the background whenever its messages
// change, sending included, so a signed-out viewer gets undefined rather
// than a redirect, which would move the page to the sign-in page under them.
// The adventure itself says they were signed out when it refuses their
// message (use_case_session_expired_in_chat).
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
  const user = await currentUser();
  if (user === undefined) {
    return undefined;
  }
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
