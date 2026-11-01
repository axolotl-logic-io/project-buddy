"use client";

import type { ComponentProps, JSX } from "react";
import { FormDialog } from "@/components/form-dialog.tsx";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

// The Chats page's "New chat" button and the dialog it opens, which holds
// the new-chat form.
export function NewChatDialog(
  props: ComponentProps<typeof NewChatForm>,
): JSX.Element {
  return (
    <FormDialog
      closeLabel={STANDALONE_CHATS_COPY.closeNewChat}
      title={STANDALONE_CHATS_COPY.newHeading}
    >
      <NewChatForm {...props} />
    </FormDialog>
  );
}
