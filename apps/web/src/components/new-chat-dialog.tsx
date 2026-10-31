"use client";

import { Dialog } from "radix-ui";
import type { ComponentProps, JSX } from "react";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

// Keeps the dialog open when Escape belongs to a control inside it that
// marks itself data-handles-escape, such as the buddy picker's open list,
// which Escape closes on its own. The dialog hears Escape first.
function keepEscapeForControl(event: KeyboardEvent): void {
  if (
    event.target instanceof Element &&
    event.target.closest("[data-handles-escape]") !== null
  ) {
    event.preventDefault();
  }
}

// The Chats page's "New chat" button and the modal dialog it opens, which
// holds the new-chat form. The dialog is named by its heading, takes focus
// when it opens and keeps it, and Escape, its close button or a click
// beside it closes it, returning focus to the button. Opening and closing
// it creates nothing; only the form's Start chat does.
export function NewChatDialog(
  props: ComponentProps<typeof NewChatForm>,
): JSX.Element {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild={true}>
        <Button className="self-start">
          <Icon name="plus" />
          {STANDALONE_CHATS_COPY.newHeading}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="dialog-panel"
          onEscapeKeyDown={keepEscapeForControl}
        >
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="section-heading">
              {STANDALONE_CHATS_COPY.newHeading}
            </Dialog.Title>
            <Dialog.Close asChild={true}>
              <Button
                aria-label={STANDALONE_CHATS_COPY.closeNewChat}
                className="min-w-(--target-size)"
                variant="secondary"
              >
                <Icon name="close" />
              </Button>
            </Dialog.Close>
          </div>
          <NewChatForm {...props} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
