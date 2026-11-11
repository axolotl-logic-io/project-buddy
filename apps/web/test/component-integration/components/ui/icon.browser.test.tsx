import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Icon } from "@/components/ui/icon.tsx";
import { applyTheme } from "../../themes/theme-test-kit.ts";
import { tabForward } from "../keyboard-test-kit.ts";

const ORDINARY_ICON_SIZE_PX = 16;
const NEXT_CONTROL = "Next";

const SYMBOLS = [
  { name: "shield", label: "Quests" },
  { name: "messages", label: "Chat" },
  { name: "bot", label: "Constructs" },
  { name: "checklist", label: "Activities" },
  { name: "pencil", label: "Edit" },
] as const;

test.each(["light", "dark"] as const)(
  "ordinary icons fit 16 px and leave control names and keyboard focus intact in %s mode",
  async (mode) => {
    applyTheme("parchment", mode);
    await render(
      <div>
        {SYMBOLS.map(({ name, label }) => (
          <button key={name} type="button" className="icon-line">
            <Icon name={name} />
            {label}
          </button>
        ))}
        <button type="button">{NEXT_CONTROL}</button>
      </div>,
    );
    page.getByRole("button", { name: "Quests", exact: true }).element().focus();
    await SYMBOLS.reduce(async (previous, { label }) => {
      await previous;
      const button = page.getByRole("button", { name: label, exact: true });
      await expect.element(button).toBeVisible();
      await expect.element(button).toHaveAccessibleName(label);
      await expect.element(button).toHaveFocus();
      const svg = button.element().querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg?.getBoundingClientRect().width).toBe(ORDINARY_ICON_SIZE_PX);
      expect(svg?.getBoundingClientRect().height).toBe(ORDINARY_ICON_SIZE_PX);
      expect(svg?.getAttribute("aria-hidden")).toBe("true");
      expect(svg?.getAttribute("focusable")).toBe("false");
      expect(svg && getComputedStyle(svg).stroke).toBe(
        getComputedStyle(button.element()).color,
      );
      await tabForward();
    }, Promise.resolve());
    await expect
      .element(page.getByRole("button", { name: NEXT_CONTROL }))
      .toHaveFocus();
  },
);
