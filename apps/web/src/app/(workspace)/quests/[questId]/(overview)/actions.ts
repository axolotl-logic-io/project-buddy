"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { startQuestConversation } from "@/conversations/start-quest.ts";
import { QUEST_ID } from "@/ids.ts";
import { OPENING_COPY } from "@/ui/copy/chat.ts";

const QUEST_FORM = z.object({ questId: QUEST_ID });

// What came of starting a quest's conversation: nothing yet, or why it
// didn't start. Starting it refreshes the page, which then shows it.
type StartConversationState =
  | { readonly kind: "idle" }
  | {
      readonly kind: "claudeUnavailable";
      readonly message: typeof OPENING_COPY.claudeUnavailable;
    };

export type { StartConversationState };

// Starts the quest's one conversation, with its opening, charged to the
// acting user, for a quest that has none yet, as after the move from
// adventures. Starting one that has started, as from a second tab, writes
// no second opening. A quest that isn't the user's is not found.
export async function startConversationAction(
  _state: StartConversationState,
  formData: FormData,
): Promise<StartConversationState> {
  const user = await requireUser();
  const form = QUEST_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const result = await startQuestConversation(user.id, form.data.questId, true);
  if (result.kind === "notFound") {
    notFound();
  }
  if (result.kind === "claudeUnavailable") {
    return {
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
    };
  }
  refresh();
  return { kind: "idle" };
}
