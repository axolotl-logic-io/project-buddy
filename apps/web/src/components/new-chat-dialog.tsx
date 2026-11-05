"use client";

import type { ComponentProps, JSX, ReactNode } from "react";
import { FormDialog } from "@/components/form-dialog.tsx";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

// The "New chat" button and the dialog it opens, which holds the new-chat
// form: on Chats, on a project with its project fixed, or on Activities
// with its activity fixed and a Start trigger.
export function NewChatDialog({
  trigger,
  ...props
}: ComponentProps<typeof NewChatForm> & {
  readonly trigger?: ReactNode;
}): JSX.Element {
  return (
    <FormDialog
      closeLabel={NEW_CHAT_COPY.closeDialog}
      title={NEW_CHAT_COPY.dialogHeading}
      trigger={trigger}
    >
      <NewChatForm {...props} />
    </FormDialog>
  );
}
