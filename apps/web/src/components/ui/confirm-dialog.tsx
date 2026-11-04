"use client";

import { AlertDialog } from "radix-ui";
import type { JSX, ReactElement, ReactNode } from "react";
import { Button } from "@/components/ui/button.tsx";

// Asks the user to confirm an action that replaces or removes something
// before it runs. trigger (a Button) opens the dialog. The dialog says what
// will happen, focuses the cancel button first, and calls onConfirm only when
// the user confirms; Escape, the cancel button or a click outside cancels.
// children, if any, follow the description, such as a link to do something
// else first.
export function ConfirmDialog({
  trigger,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: {
  readonly trigger: ReactElement;
  readonly title: string;
  readonly description: string;
  readonly children?: ReactNode;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
}): JSX.Element {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild={true}>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-panel">
          <AlertDialog.Title className="section-heading">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-muted">
            {description}
          </AlertDialog.Description>
          {children}
          <div className="mt-2 flex flex-wrap justify-end gap-3">
            <AlertDialog.Cancel asChild={true}>
              <Button variant="secondary">{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild={true}>
              <Button onClick={onConfirm}>{confirmLabel}</Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
