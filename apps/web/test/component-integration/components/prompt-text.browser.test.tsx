import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { PromptText } from "@/components/prompt-text.tsx";
import { THEME_IDS } from "@/themes/themes.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import { NARROWEST_VIEWPORT, setViewport } from "../viewports-test-kit.ts";

const READ_ONLY_TEXT = "## Greeting\n\nHello **{{name}}**.";

test("built-in prompt is read-only Markdown with its placeholder intact", async () => {
  await render(
    <PromptText
      text={READ_ONLY_TEXT}
      label="Prompt"
      help="Voice and habits."
    />,
  );
  await expect
    .element(page.getByRole("heading", { name: "Greeting" }))
    .toBeVisible();
  await expect
    .element(page.getByText("{{name}}", { exact: true }))
    .toBeVisible();
  expect(page.getByRole("textbox").elements()).toHaveLength(0);
});

const LONG_WORD_REPETITIONS = 100;

for (const theme of THEME_IDS) {
  for (const mode of ["light", "dark"]) {
    test(`prompt Markdown fits a narrow phone in ${theme} ${mode}`, async () => {
      await setViewport(NARROWEST_VIEWPORT);
      applyTheme(theme, mode);
      await render(
        <PromptText
          label="Prompt"
          help="Voice and habits"
          text={`Hello **{{name}}**. ${"long".repeat(LONG_WORD_REPETITIONS)}`}
        />,
      );
      await expect
        .element(page.getByText("{{name}}", { exact: true }))
        .toBeVisible();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        window.innerWidth,
      );
    });
  }
}
