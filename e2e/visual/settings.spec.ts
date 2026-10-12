// The Settings page, with one extra switched off, so the shots show a
// switch in each state.
import { expect, type Page } from "@playwright/test";
import { FLAG_COPY } from "@/ui/copy/settings.ts";
import { logIn } from "../log-in.ts";
import { describeVisualPage } from "./visual-page.ts";

describeVisualPage({
  name: "settings",
  listsEveryProject: false,
  open: async (page: Page): Promise<void> => {
    await logIn(page);
    await page.goto("/settings");
    const toolLines = page.getByRole("switch", {
      name: FLAG_COPY.toolLines.label,
    });
    await toolLines.click();
    await expect(toolLines).not.toBeChecked();
  },
});
