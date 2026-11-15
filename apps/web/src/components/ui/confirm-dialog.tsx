"use client";

import { AlertDialog } from "radix-ui";
import {
  type JSX,
  type ReactElement,
  useCallback,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button.tsx";

// The modal <dialog> the element is in, if any. A modal dialog sits in the
// browser's top layer, above anything portalled to the body.
function modalDialogAround(
  element: HTMLElement | null,
): HTMLElement | undefined {
  const dialog = element?.closest("dialog");
  if (dialog === null || dialog === undefined || !dialog.matches(":modal")) {
    return undefined;
  }
  return dialog;
}

// Asks the user to confirm an action that replaces or removes something
// before it runs. trigger (a Button) opens the dialog. The dialog says what
// will happen, focuses the cancel button first, and calls onConfirm only when
// the user confirms; Escape, the cancel button or a click outside cancels.
// The confirm button is primary, or danger for a removal, such as deleting
// or revoking something. Opened from inside a modal <dialog>, such as the
// quest sidebar drawer, it opens inside that dialog, so it shows above it
// and the drawer's controls stay out of reach until it closes.
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmFocusId,
  focusHandledOnConfirm,
  variant = "primary",
}: {
  readonly trigger: ReactElement;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly confirmFocusId?: string;
  readonly focusHandledOnConfirm?: boolean;
  readonly variant?: "primary" | "danger";
}): JSX.Element {
  const confirmedRef = useRef<boolean>(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [container, setContainer] = useState<HTMLElement | undefined>();
  const changeOpen = useCallback((next: boolean): void => {
    if (next) {
      setContainer(modalDialogAround(triggerRef.current));
    }
    setOpen(next);
  }, []);
  const confirm = useCallback((): void => {
    confirmedRef.current = true;
    onConfirm();
  }, [onConfirm]);
  const restoreFocus = useCallback(
    (event: Event): void => {
      if (
        confirmedRef.current &&
        (confirmFocusId !== undefined || focusHandledOnConfirm === true)
      ) {
        event.preventDefault();
        if (confirmFocusId !== undefined) {
          document
            .querySelector<HTMLElement>(`#${CSS.escape(confirmFocusId)}`)
            ?.focus();
        }
      }
      confirmedRef.current = false;
    },
    [confirmFocusId, focusHandledOnConfirm],
  );
  return (
    <AlertDialog.Root open={open} onOpenChange={changeOpen}>
      <AlertDialog.Trigger asChild={true} ref={triggerRef}>
        {trigger}
      </AlertDialog.Trigger>
      <AlertDialog.Portal container={container}>
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
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <AlertDialog.Cancel asChild={true}>
              <Button variant="secondary">{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild={true}>
              <Button onClick={confirm} variant={variant}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
