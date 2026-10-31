"use client";

import { Dialog } from "radix-ui";
import type { JSX, ReactNode } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";

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

// A button named title and the modal dialog it opens, which holds a form
// for making something new. The dialog is named by its heading, also
// title, takes focus when it opens and keeps it, and Escape, its close
// button or a click beside it closes it, returning focus to the button.
// Opening and closing it creates nothing; only the form can.
export function FormDialog({
  title,
  closeLabel,
  children,
}: {
  title: string;
  closeLabel: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild={true}>
        <Button className="self-start">
          <Icon name="plus" />
          {title}
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
            <Dialog.Title className="section-heading">{title}</Dialog.Title>
            <Dialog.Close asChild={true}>
              <Button
                aria-label={closeLabel}
                className="min-w-(--target-size)"
                variant="secondary"
              >
                <Icon name="close" />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
