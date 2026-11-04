// The message the viewer is writing in a chat, kept as a local draft
// (local-draft.ts) for each viewer and chat, so it is still in the box when
// they come back to the chat, from another page or after a reload. Sending
// the message empties the box, which forgets the draft. Only the browser
// imports this module.
import type { AssistantRuntime } from "@assistant-ui/react";
import { useEffect } from "react";
import { z } from "zod";
import { keepLocalDraft, readLocalDraft } from "@/components/local-draft.ts";
import type { ChatId, UserId } from "@/ids.ts";

const COMPOSER_DRAFT = z.string();

// Puts the viewer's kept message for the chat back in an empty box, then
// keeps what the box holds from then on. Images added to the message aren't
// kept.
function useComposerDraft(
  runtime: AssistantRuntime,
  { viewer, chatId }: { readonly viewer: UserId; readonly chatId: ChatId },
): void {
  useEffect(() => {
    const key = `chat:${viewer}:${chatId}`;
    const { composer } = runtime.thread;
    const kept = readLocalDraft(key, COMPOSER_DRAFT);
    if (kept !== undefined && composer.getState().text === "") {
      composer.setText(kept);
    }
    return composer.subscribe(() => {
      const { text } = composer.getState();
      if (text === "") {
        keepLocalDraft(key, undefined);
        return;
      }
      keepLocalDraft(key, text);
    });
  }, [runtime, viewer, chatId]);
}

export { useComposerDraft };
