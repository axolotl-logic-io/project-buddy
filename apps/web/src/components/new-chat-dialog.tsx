"use client";

import type { ComponentProps, JSX } from "react";
import { FormDialog } from "@/components/form-dialog.tsx";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

// The "New chat" button and the dialog it opens, which holds the new-chat
// form: on the Chats page, and on a project's page with its project fixed.
export function NewChatDialog(
  props: ComponentProps<typeof NewChatForm>,
): JSX.Element {
  return (
    <FormDialog
      closeLabel={NEW_CHAT_COPY.closeDialog}
      title={NEW_CHAT_COPY.dialogHeading}
    >
      <NewChatForm {...props} />
    </FormDialog>
  );
}
