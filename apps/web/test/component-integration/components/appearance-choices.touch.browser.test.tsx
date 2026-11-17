import { beforeEach, expect, test, vi } from "vitest";
import { commands, page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AppearanceChoices } from "@/components/appearance-choices.tsx";
import type { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { THEME_MODES } from "@/themes/themes.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { NARROWEST_VIEWPORT, setViewport } from "../viewports-test-kit.ts";

const TARGET_SIZE = 44;

const action = vi.hoisted(() => ({
  saveThemeChoiceAction: vi.fn<typeof saveThemeChoiceAction>(),
}));
vi.mock("@/themes/save-theme-choice-action.ts", () => action);

beforeEach(async () => {
  action.saveThemeChoiceAction.mockResolvedValue();
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
  await setViewport(NARROWEST_VIEWPORT);
});

test.each(THEME_MODES)(
  "a tap names, selects and saves %s at 320 px",
  async (mode) => {
    await render(<AppearanceChoices settings={true} />);
    const name = THEME_COPY.modes[mode];
    const radio = page.getByRole("radio", { name, exact: true });
    await commands.tap(
      page.getByRole("radio", {
        name: THEME_COPY.modes["soot-brass"],
        exact: true,
      }).selector,
    );
    await commands.tap(radio.selector);
    await expect.element(radio).toBeChecked();
    await expect.element(radio).toHaveFocus();
    const tooltip = page.getByRole("tooltip", { name });
    await expect.element(tooltip).toBeVisible();
    const bounds = tooltip.element().getBoundingClientRect();
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(NARROWEST_VIEWPORT.width);
    const target = radio.element().getBoundingClientRect();
    expect(target.width).toBeGreaterThanOrEqual(TARGET_SIZE);
    expect(target.height).toBeGreaterThanOrEqual(TARGET_SIZE);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      NARROWEST_VIEWPORT.width,
    );
    expect(action.saveThemeChoiceAction).toHaveBeenLastCalledWith({
      theme: "parchment",
      mode,
    });
  },
);
