"use client";

import { AlertDialog } from "radix-ui";
import { type JSX, type ReactElement, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";

// Asks the user to confirm an action that replaces or removes something
// before it runs. trigger (a Button) opens the dialog. The dialog says what
// will happen, focuses the cancel button first, and calls onConfirm only when
// the user confirms; Escape, the cancel button or a click outside cancels.
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmFocusId,
}: {
  readonly trigger: ReactElement;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly confirmFocusId?: string;
}): JSX.Element {
  const confirmedRef = useRef<boolean>(false);
  const confirm = useCallback((): void => {
    confirmedRef.current = true;
    onConfirm();
  }, [onConfirm]);
  const restoreFocus = useCallback(
    (event: Event): void => {
      if (confirmedRef.current && confirmFocusId !== undefined) {
        event.preventDefault();
        document
          .querySelector<HTMLElement>(`#${CSS.escape(confirmFocusId)}`)
          ?.focus();
      }
      confirmedRef.current = false;
    },
    [confirmFocusId],
  );
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild={true}>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content
          className="dialog-panel"
          onCloseAutoFocus={restoreFocus}
        >
          <AlertDialog.Title className="section-heading">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-muted">
            {description}
          </AlertDialog.Description>
          <div className="mt-2 flex flex-wrap justify-end gap-3">
            <AlertDialog.Cancel asChild={true}>
              <Button variant="secondary">{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild={true}>
              <Button onClick={confirm}>{confirmLabel}</Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
