import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";

const TITLE = "Restore version 1?";
const RESTORE = "Restore version 1";
const DESCRIPTION = "The memory goes back to the text of version 1.";

const onConfirm = vi.fn<() => void>();

function renderDialog(): void {
  render(
    <ConfirmDialog
      cancelLabel="Cancel"
      confirmLabel={RESTORE}
      description={DESCRIPTION}
      onConfirm={onConfirm}
      title={TITLE}
      trigger={<Button variant="quiet">{RESTORE}</Button>}
    />,
  );
}

function openDialog(): HTMLElement {
  fireEvent.click(screen.getByRole("button", { name: RESTORE }));
  return screen.getByRole("alertdialog", { name: TITLE });
}

beforeEach(() => {
  onConfirm.mockClear();
});

describe("ConfirmDialog", () => {
  test("says what will happen, with the cancel button focused", () => {
    renderDialog();

    const dialog = openDialog();

    expect(dialog).toHaveAccessibleDescription(DESCRIPTION);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  test("confirms once, then closes", () => {
    renderDialog();
    const dialog = openDialog();

    fireEvent.click(within(dialog).getByRole("button", { name: RESTORE }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("cancels with the cancel button, without confirming", () => {
    renderDialog();
    openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
