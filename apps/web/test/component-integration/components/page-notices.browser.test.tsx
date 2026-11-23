import { beforeEach, describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus, Notice } from "@/components/ui/form-message.tsx";

import { tabForward } from "../../support/keyboard-test-kit.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  MINIMUM_TARGET_PX,
  NARROWEST_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

const WARNING = "This quest is completed. ";
const RESTORE = "Restore this quest";
const SAVED = "Saved.";
const FAILED = "Could not save. Try again.";
const NAME = "Name";
const REQUIRED = "Enter a name.";

for (const mode of ["light", "dark"]) {
  describe(`page notices in ${mode} mode`, () => {
    beforeEach(async () => {
      applyTheme("parchment", mode);
      await setViewport(NARROWEST_VIEWPORT);
    });

    

    test("static warning keeps its link readable and keyboard reachable", async () => {
      await render(
        <Notice>
          {WARNING}
          <a href="#restore">{RESTORE}</a>
        </Notice>,
      );
      expect(page.getByRole("status").elements()).toHaveLength(0);
      expect(page.getByRole("alert").elements()).toHaveLength(0);
      const link = page.getByRole("link", { name: "Restore this quest" });
      await tabForward();
      await expect.element(link).toHaveFocus();
      const look = getComputedStyle(link.element());
      expect(look.outlineStyle).not.toBe("none");
      expect(
        link.element().getBoundingClientRect().height,
      ).toBeGreaterThanOrEqual(MINIMUM_TARGET_PX);
      expect(link.element().getBoundingClientRect().right).toBeLessThanOrEqual(
        NARROWEST_VIEWPORT.width,
      );
    });

    test("routine feedback keeps its live region mounted without an empty box", async () => {
      const view = await render(<FormStatus />);
      const element = page.getByRole("status").element();
      expect(Number.parseFloat(getComputedStyle(element).paddingTop)).toBe(0);
      await view.rerender(<FormStatus>{SAVED}</FormStatus>);
      await expect.element(page.getByRole("status")).toHaveTextContent(SAVED);
      expect(page.getByRole("status").element()).toBe(element);
      expect(
        Number.parseFloat(getComputedStyle(element).paddingTop),
      ).toBeGreaterThan(0);
    });

    test("page errors stand apart while field errors stay beside the field", async () => {
      await render(
        <>
          <Alert>{FAILED}</Alert>
          <TextField label={NAME} error={REQUIRED} />
        </>,
      );
      const errors = page.getByRole("alert");
      await expect.element(errors.first()).toHaveTextContent(FAILED);
      expect(
        Number.parseFloat(
          getComputedStyle(errors.first().element()).borderTopWidth,
        ),
      ).toBeGreaterThan(0);
      expect(
        Number.parseFloat(getComputedStyle(errors.last().element()).paddingTop),
      ).toBe(0);
    });
  });
}
