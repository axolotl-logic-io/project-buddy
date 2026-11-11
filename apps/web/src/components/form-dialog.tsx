"use client";

import { Dialog } from "radix-ui";
import type { FocusEvent, JSX, ReactNode } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";

// Radix wraps focus with preventScroll. Reveal controls inside this panel
// without moving focus or changing the browser's selection in a field.
function revealFocusedControl(event: FocusEvent<HTMLDivElement>): void {
  const { target, currentTarget } = event;
  if (target instanceof HTMLElement && currentTarget.contains(target)) {
    target.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "instant",
    });
  }
}

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
  defaultOpen = false,
}: {
  title: string;
  closeLabel: string;
  children: ReactNode;
  trigger?: ReactNode;
  // Whether the dialog starts open, as when the page was opened to start
  // this very thing.
  defaultOpen?: boolean;
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
    <Dialog.Root defaultOpen={defaultOpen}>
      <Dialog.Trigger asChild={true}>{triggerButton}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="dialog-panel"
          onFocusCapture={revealFocusedControl}
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
