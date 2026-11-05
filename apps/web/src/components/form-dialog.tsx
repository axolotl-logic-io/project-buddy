"use client";

import { Dialog } from "radix-ui";
import type { JSX, ReactNode } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";

// A supplied trigger, or a button named title, and its modal dialog with a form
// for making something new. The dialog is named by its heading, also
// title, takes focus when it opens and keeps it, and Escape, its close
// button or a click beside it closes it, returning focus to the button.
// Opening and closing it creates nothing; only the form can.
export function FormDialog({
  title,
  closeLabel,
  children,
  trigger,
}: {
  title: string;
  closeLabel: string;
  children: ReactNode;
  trigger?: ReactNode;
}): JSX.Element {
  let triggerButton = trigger;
  if (triggerButton === undefined) {
    triggerButton = (
      <Button className="self-start">
        <Icon name="plus" />
        {title}
      </Button>
    );
  }
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild={true}>{triggerButton}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content aria-describedby={undefined} className="dialog-panel">
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
