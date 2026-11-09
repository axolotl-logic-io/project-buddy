import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChatError } from "@/components/chat/chat-error.tsx";
import { TextField } from "@/components/ui/field.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { IMAGE_COPY } from "@/ui/copy/images.ts";
import { applyTheme } from "../../themes/theme-test-kit.ts";
import { NARROWEST_VIEWPORT, setViewport } from "../../viewports-test-kit.ts";

const PAGE_FAILURE = "Could not save.";
const FIELD_FAILURE = "Enter a name.";
const NAME = "Name";

for (const mode of ["light", "dark"]) {
  describe(`failed reply in ${mode} mode`, () => {
    test("reply and page failures are grouped while field errors stay inline", async () => {
      applyTheme("parchment", mode);
      await setViewport(NARROWEST_VIEWPORT);
      const retry = vi.fn();
      await render(
        <>
          <ChatError error={new Error("overloaded")} onRetry={retry} />
          <Alert>{PAGE_FAILURE}</Alert>
          <TextField label={NAME} error={FIELD_FAILURE} />
        </>,
      );
      const alerts = page.getByRole("alert");
      await expect.element(alerts.nth(0)).toBeVisible();
      await expect.element(alerts.nth(1)).toHaveTextContent(PAGE_FAILURE);
      await expect.element(alerts.nth(2)).toHaveTextContent(FIELD_FAILURE);
      for (const notice of [alerts.nth(0), alerts.nth(1)]) {
        const element = notice.element();
        const look = getComputedStyle(element);
        expect(Number.parseFloat(look.borderTopWidth)).toBeGreaterThan(0);
        expect(Number.parseFloat(look.paddingTop)).toBeGreaterThan(0);
        expect(look.borderTopColor).toBe(look.color);
        expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);
      }
      const inline = getComputedStyle(alerts.nth(2).element());
      expect(Number.parseFloat(inline.borderTopWidth)).toBe(0);
      expect(Number.parseFloat(inline.paddingTop)).toBe(0);
      await page.getByRole("button", { name: IMAGE_COPY.retry }).click();
      expect(retry).toHaveBeenCalledOnce();
      await expect.element(alerts.nth(0)).toBeVisible();
    });
  });
}
