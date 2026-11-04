// The message the viewer is writing in a chat, kept as a local draft
// (local-draft.ts) for each viewer and chat, so it is still in the box when
// they come back to the chat, from another page or after a reload. Sending
// the message empties the box, which forgets the draft. Images added to it
// can't be kept, only how many there were, so that coming back can say they
// need adding again.
import type { AssistantRuntime } from "@assistant-ui/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  keepLocalDraft,
  readLocalDraft,
  useKeptDraft,
} from "@/components/local-draft.ts";
import type { ChatId, UserId } from "@/ids.ts";

const COMPOSER_DRAFT = z.object({
  text: z.string(),
  images: z.number().int().nonnegative(),
});

// Puts the viewer's kept message for the chat back in an empty box, then
// keeps what the box holds from then on. Returns how many images the kept
// message had, which aren't back, until the viewer adds an image or empties
// the box; 0 otherwise.
function useComposerDraft(
  runtime: AssistantRuntime,
  { viewer, chatId }: { readonly viewer: UserId; readonly chatId: ChatId },
): number {
  const key = `chat:${viewer}:${chatId}`;
  const { kept } = useKeptDraft(key, COMPOSER_DRAFT);
  const [settled, setSettled] = useState<boolean>(false);
  useEffect(() => {
    const { composer } = runtime.thread;
    const restored = readLocalDraft(key, COMPOSER_DRAFT);
    if (restored !== undefined && composer.getState().text === "") {
      composer.setText(restored.text);
    }
    return composer.subscribe(() => {
      const { text, attachments } = composer.getState();
      if (attachments.length > 0 || text === "") {
        setSettled(true);
      }
      if (text === "" && attachments.length === 0) {
        keepLocalDraft(key, undefined);
        return;
      }
      keepLocalDraft(key, { text, images: attachments.length });
    });
  }, [runtime, key]);
  if (settled || kept === undefined) {
    return 0;
  }
  return kept.images;
}

export { useComposerDraft };
