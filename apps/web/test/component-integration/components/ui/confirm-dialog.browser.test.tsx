// A confirm dialog's confirm button: the primary button for an action that
// replaces something, and the danger colour for one that removes something,
// in both modes. The screens' own tests check which one each dialog uses.
import type { JSX } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { applyTheme } from "../../themes/theme-test-kit.ts";
import { paintOf, tokenColor } from "./button-fill-test-kit.ts";

const OPEN = "Throw it out";
const TITLE = "Throw this out?";
const CONFIRM = "Throw it out for good";

function confirmIgnoringIt(): void {
  // The tests open the dialog and look at it; nothing is confirmed.
}

// The dialog, confirming in the given variant, or in its default one.
function dialog(variant?: "danger"): JSX.Element {
  const props = {
    cancelLabel: "Keep it",
    confirmLabel: CONFIRM,
    description: "It can't be brought back.",
    onConfirm: confirmIgnoringIt,
    title: TITLE,
    trigger: <Button variant="secondary">{OPEN}</Button>,
  };
  if (variant === "danger") {
    return <ConfirmDialog {...props} variant="danger" />;
  }
  return <ConfirmDialog {...props} />;
}

// Opens shown and returns its confirm button.
async function openDialog(shown: JSX.Element): Promise<Element> {
  await render(shown);
  await page.getByRole("button", { name: OPEN }).click();
  const confirm = page
    .getByRole("alertdialog", { name: TITLE })
    .getByRole("button", { name: CONFIRM });
  return await vi.waitFor(() => confirm.element());
}

for (const mode of ["light", "dark"]) {
  describe(`a confirm dialog in ${mode} mode`, () => {
    beforeEach(() => {
      applyTheme("parchment", mode);
    });

    test("confirms with the primary button by default", async () => {
      expect(paintOf(await openDialog(dialog()))).toEqual({
        fill: tokenColor("primary"),
        text: tokenColor("on-primary"),
      });
    });

    test("confirms a removal in the danger colour", async () => {
      expect(paintOf(await openDialog(dialog("danger")))).toEqual({
        fill: tokenColor("danger"),
        text: tokenColor("on-danger"),
      });
    });
  });
}
