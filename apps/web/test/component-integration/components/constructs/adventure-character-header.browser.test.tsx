import { describe, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ConstructPicker } from "@/components/construct-picker.tsx";
import { AdventureCharacterHeader } from "@/components/constructs/adventure-character-header.tsx";
import type { ConstructSnapshot } from "@/constructs/construct.ts";
import { getConstruct } from "@/constructs/index.ts";
import { CONSTRUCT_DISCOVERY_COPY } from "@/ui/copy/construct-discovery.ts";
import { NARROWEST_VIEWPORT, setViewport } from "../../viewports-test-kit.ts";
import { tabForward } from "../keyboard-test-kit.ts";

const PRIVATE_TEXT = "Private instructions that must stay hidden";
const OWN: ConstructSnapshot = {
  name: "Lumen",
  definition: {
    prompt: PRIVATE_TEXT,
    visual: { version: 1, description: PRIVATE_TEXT },
  },
};

describe("use_case_view_character_profile", () => {
  test("keyboard opens the saved character, traps focus and returns it on Escape and close", async () => {
    const snapshot = { ...getConstruct("vellum"), name: "Old Mapmaker" };
    await render(<AdventureCharacterHeader construct={snapshot} />);
    const trigger = page.getByRole("button", { name: "About Old Mapmaker" });
    trigger.element().focus();
    await userEvent.keyboard("{Enter}");
    const dialog = page.getByRole("dialog", { name: "Old Mapmaker" });
    await expect.element(dialog).toBeVisible();
    await expect
      .element(page.getByText(CONSTRUCT_DISCOVERY_COPY.vellum.approach))
      .toBeVisible();
    const image = dialog.element().querySelector("img");
    expect(new URL(image?.src ?? "", globalThis.location.href).pathname).toBe(
      "/constructs/vellum-v1.png",
    );
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

  test("own and legacy identities keep their name and initials without private instructions or inferred personality", async () => {
    await render(<AdventureCharacterHeader construct={OWN} />);
    await page.getByRole("button", { name: "About Lumen" }).click();
    await expect
      .element(page.getByRole("dialog", { name: "Lumen" }))
      .toBeVisible();
    await expect
      .element(page.getByText(CONSTRUCT_DISCOVERY_COPY.own.approach))
      .toBeVisible();
    await expect.element(page.getByText(PRIVATE_TEXT)).not.toBeInTheDocument();
    await expect
      .element(page.getByText(CONSTRUCT_DISCOVERY_COPY.lumen.temperament))
      .not.toBeInTheDocument();
    expect(page.getByRole("dialog").element().querySelector("img")).toBeNull();
    await expect
      .element(page.getByRole("dialog").getByText("L", { exact: true }))
      .toBeVisible();
  });

  test("picker and profile fit a 320px phone, and closing leaves the composer usable", async () => {
    await setViewport(NARROWEST_VIEWPORT);
    await render(
      <div>
        <AdventureCharacterHeader construct={getConstruct("lumen")} />
        <ConstructPicker />
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
