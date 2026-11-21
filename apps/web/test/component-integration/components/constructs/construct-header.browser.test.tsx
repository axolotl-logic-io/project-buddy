import { describe, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ConstructHeader } from "@/components/constructs/construct-header.tsx";
import { getConstruct } from "@/constructs/index.ts";
import { CONSTRUCT_DISCOVERY_COPY } from "@/ui/copy/construct-discovery.ts";
import { tabForward } from "../../../support/keyboard-test-kit.ts";
import { NARROWEST_VIEWPORT, setViewport } from "../../viewports-test-kit.ts";

describe("use_case_view_character_profile", () => {
  test("keyboard opens the character, traps focus and returns it on Escape and close", async () => {
    await render(<ConstructHeader construct={getConstruct("vellum")} />);
    const trigger = page.getByRole("button", { name: "About Vellum" });
    trigger.element().focus();
    await userEvent.keyboard("{Enter}");
    const dialog = page.getByRole("dialog", { name: "Vellum" });
    await expect.element(dialog).toBeVisible();
    await expect
      .element(page.getByText(CONSTRUCT_DISCOVERY_COPY.vellum.approach))
      .toBeVisible();
    const portrait = dialog
      .getByText("V", { exact: true })
      .element().parentElement;
    expect(portrait?.querySelector("svg")).toBeInstanceOf(SVGSVGElement);
    await tabForward();
    expect(dialog.element().contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
    await trigger.click();
    await page
      .getByRole("button", { name: CONSTRUCT_DISCOVERY_COPY.closeProfile })
      .click();
    await expect.element(trigger).toHaveFocus();
  });

  test("the profile fits a 320px phone, and closing leaves the composer usable", async () => {
    await setViewport(NARROWEST_VIEWPORT);
    await render(
      <div>
        <ConstructHeader construct={getConstruct("lumen")} />
        <textarea aria-label="Message" />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth,
    );
    await page.getByRole("button", { name: "About Lumen" }).click();
    const dialog = page.getByRole("dialog");
    const bounds = dialog.element().getBoundingClientRect();
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(window.innerWidth);
    expect(dialog.element().scrollWidth).toBeLessThanOrEqual(
      dialog.element().clientWidth,
    );
    await page
      .getByRole("button", { name: CONSTRUCT_DISCOVERY_COPY.closeProfile })
      .click();
    await page.getByRole("textbox", { name: "Message" }).fill("Next step");
    await expect
      .element(page.getByRole("textbox", { name: "Message" }))
      .toHaveValue("Next step");
  });
});
