"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { chosenBuddy } from "@/buddies/chosen-buddy.ts";
import type { BuddyId } from "@/buddies/index.ts";
import { createCentralChat } from "@/chats/central-chat.ts";
import type { UserBuddyId } from "@/ids.ts";
import { checkQuota } from "@/quota/quota.ts";
import { NEW_CHAT_COPY, quotaUsedUpMessage } from "@/ui/copy/chat.ts";

const START_STANDALONE_CHAT_FORM = z.object({
  buddyId: z.string({ error: NEW_CHAT_COPY.chooseBuddy }),
});

type StartStandaloneChatResult =
  | { readonly kind: "invalid"; readonly message: string }
  | {
      readonly kind: "quotaUsedUp";
      readonly message: string;
      readonly buddyId: BuddyId | UserBuddyId;
    };

type StartStandaloneChatState =
  | { readonly kind: "idle" }
  | StartStandaloneChatResult;

// Starts an empty project-free conversation in the selected buddy. The
// buddy stays fixed for its lifetime, as in a project chat.
async function startStandaloneChatAction(
  _state: StartStandaloneChatState,
  formData: FormData,
): Promise<StartStandaloneChatResult> {
  const user = await requireUser();
  const form = START_STANDALONE_CHAT_FORM.safeParse(
    Object.fromEntries(formData),
  );
  if (!form.success) {
    return { kind: "invalid", message: NEW_CHAT_COPY.chooseBuddy };
  }
  const chosen = await chosenBuddy(user.id, form.data.buddyId);
  if (chosen === undefined) {
    return { kind: "invalid", message: NEW_CHAT_COPY.chooseBuddy };
  }
  const quota = await checkQuota(user.id);
  if (quota.kind === "usedUp") {
    return {
      kind: "quotaUsedUp",
      message: quotaUsedUpMessage(quota.resetsOn),
      buddyId: chosen.id,
    };
  }
  const chat = await createCentralChat(user.id, chosen.buddy);
  revalidatePath("/chat");
  redirect(`/chats/${chat.id}`);
}

export type { StartStandaloneChatState };
export { startStandaloneChatAction };
