import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { PromptText } from "@/components/prompt-text.tsx";
import { THEME_IDS } from "@/themes/themes.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import { NARROWEST_VIEWPORT, setViewport } from "../viewports-test-kit.ts";

test("one construct prompt preserves Markdown and literal placeholders when edited", async () => {
  const text = "# Voice\nHello {{name}}.\n\n## Habits\n- Ask first.";
  await render(
    <form aria-label="Save construct">
      <PromptText
        editable={true}
        text={text}
        label="Prompt"
        help="Voice and habits."
        name="prompt"
      />
    </form>,
  );
  const field = page.getByRole("textbox", { name: "Prompt" });
  await expect.element(field).toHaveValue(text);
  await field.fill("Changed {{name}}");
  const form = page.getByRole("form", { name: "Save construct" }).element();
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Missing form");
  }
  expect(new FormData(form).get("prompt")).toBe("Changed {{name}}");
  expect(page.getByRole("textbox").elements()).toHaveLength(1);
});
const READ_ONLY_TEXT = "## Greeting\n\nHello **{{name}}**.";

test("built-in prompt is read-only Markdown with its placeholder intact", async () => {
  await render(
    <PromptText
      editable={false}
      text={READ_ONLY_TEXT}
      label="Prompt"
      help="Voice and habits."
      name="prompt"
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
          editable={false}
          name="prompt"
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
