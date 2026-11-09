import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { RetirementFeedback } from "@/components/retirement-feedback.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus, Notice } from "@/components/ui/form-message.tsx";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  MINIMUM_TARGET_PX,
  NARROWEST_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";
import { tabForward } from "./keyboard-test-kit.ts";

const WARNING = "This quest is completed. ";
const RESTORE = "Restore this quest";
const SAVED = "Saved.";
const FAILED = "Could not save. Try again.";
const NAME = "Name";
const REQUIRED = "Enter a name.";

for (const mode of ["light", "dark"]) {
  describe(`page notices in ${mode} mode`, () => {
    test("retirement feedback has a visible boundary and space at 320 px", async () => {
      applyTheme("parchment", mode);
      await setViewport(NARROWEST_VIEWPORT);
      await render(<RetirementFeedback completed={true} />);
      const result = page.getByRole("status");
      await expect.element(result).toHaveTextContent(RETIREMENT_COPY.retired);
      await expect.element(result).toHaveFocus();
      const element = result.element();
      const look = getComputedStyle(element);
      expect(Number.parseFloat(look.borderTopWidth)).toBeGreaterThan(0);
      expect(Number.parseFloat(look.paddingTop)).toBeGreaterThan(0);
      expect(look.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
      expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);
      expect(element.getBoundingClientRect().right).toBeLessThanOrEqual(
        NARROWEST_VIEWPORT.width,
      );
    });

    test("static warning keeps its link readable and keyboard reachable", async () => {
      applyTheme("parchment", mode);
      await setViewport(NARROWEST_VIEWPORT);
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
  });
}

test("routine feedback keeps its live region mounted without an empty box", async () => {
  const view = await render(<FormStatus />);
  const element = page.getByRole("status").element();
  expect(Number.parseFloat(getComputedStyle(element).paddingTop)).toBe(0);
  await view.rerender(<FormStatus>{SAVED}</FormStatus>);
  await expect.element(page.getByRole("status")).toHaveTextContent("Saved.");
  expect(page.getByRole("status").element()).toBe(element);
  await expect
    .poll(() => Number.parseFloat(getComputedStyle(element).paddingTop))
    .toBeGreaterThan(0);
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
