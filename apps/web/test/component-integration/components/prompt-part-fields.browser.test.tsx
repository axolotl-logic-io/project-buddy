import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { projectBreakdown } from "@/activities/project-breakdown.ts";
import { activityPartFields } from "@/app/(workspace)/activities/[activityId]/part-fields.ts";
import { buddyPartFields } from "@/app/(workspace)/buddies/[buddyId]/part-fields.ts";
import { getBuddy } from "@/buddies/index.ts";
import { PromptPartFields } from "@/components/prompt-part-fields.tsx";
import type { PromptPartField } from "@/prompts/prompt-part-field.ts";
import { THEME_IDS } from "@/themes/themes.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import { NARROWEST_VIEWPORT, setViewport } from "../viewports-test-kit.ts";

const LONG_WORD_REPETITIONS = 100;
const BREAKDOWN_INSTRUCTION_COUNT = 5;

const PLACEHOLDER_PART: PromptPartField = {
  key: "voice",
  label: "Voice",
  help: "How the buddy talks.",
  text:
    "## Greeting\n\nHello **{{name}}**.\n\n- Keep the placeholder.\n\n" +
    "long".repeat(LONG_WORD_REPETITIONS),
};

test("Project breakdown parts render as labelled Markdown", async () => {
  const fields = activityPartFields(projectBreakdown.parts);
  await render(<PromptPartFields editable={false} fields={fields} />);
  expect(page.getByRole("textbox").elements()).toHaveLength(0);
  await Promise.all(
    fields.map(async ({ label, help }) => {
      const part = page.getByRole("region", { name: label, exact: true });
      await expect
        .element(part.getByRole("heading", { name: label }))
        .toBeVisible();
      await expect
        .element(part)
        .toHaveAccessibleDescription(
          [help, PROMPT_COPY.namePlaceholderHint].join(" "),
        );
    }),
  );
  await expect
    .element(
      page.getByRole("heading", {
        name: "Activity: Project breakdown",
        level: 4,
      }),
    )
    .toBeVisible();
  expect(page.getByRole("heading", { level: 1 }).elements()).toHaveLength(0);
  expect(page.getByRole("listitem").elements()).toHaveLength(
    BREAKDOWN_INSTRUCTION_COUNT,
  );
  await expect
    .element(
      page.getByText(projectBreakdown.parts.openingKickoff, { exact: true }),
    )
    .toBeVisible();
});

test("buddy parts share read-only Markdown and keep literal placeholders", async () => {
  const fields = buddyPartFields(getBuddy("hippy").parts);
  const screen = await render(
    <PromptPartFields editable={false} fields={fields} />,
  );
  await Promise.all(
    fields.map(async ({ label }) => {
      await expect
        .element(page.getByRole("region", { name: label, exact: true }))
        .toBeVisible();
    }),
  );
  expect(page.getByRole("textbox").elements()).toHaveLength(0);
  await screen.rerender(
    <PromptPartFields editable={false} fields={[PLACEHOLDER_PART]} />,
  );
  await expect
    .element(page.getByRole("heading", { name: "Greeting", level: 5 }))
    .toBeVisible();
  await expect
    .element(page.getByText("{{name}}", { exact: true }))
    .toBeVisible();
  const placeholder = page.getByText("{{name}}", { exact: true }).element();
  const boldWeight = 600;
  expect(
    Number(getComputedStyle(placeholder).fontWeight),
  ).toBeGreaterThanOrEqual(boldWeight);
});

test("editable parts retain Markdown source and submit edits with reset controls", async () => {
  const screen = await render(
    <form aria-label="Save prompt">
      <PromptPartFields editable={false} fields={[PLACEHOLDER_PART]} />
    </form>,
  );
  await screen.rerender(
    <form aria-label="Save prompt">
      <PromptPartFields editable={true} fields={[PLACEHOLDER_PART]} />
    </form>,
  );
  const source = page.getByRole("textbox", { name: PLACEHOLDER_PART.label });
  await expect.element(source).toHaveValue(PLACEHOLDER_PART.text);
  const edited = "# Changed\n\nKeep **{{name}}**.";
  await source.fill(edited);
  const form = page.getByRole("form", { name: "Save prompt" }).element();
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("The save form is missing");
  }
  expect(new FormData(form).get(PLACEHOLDER_PART.key)).toBe(edited);
  await expect
    .element(
      page.getByRole("button", {
        name: PROMPT_COPY.resetLabel(PLACEHOLDER_PART.label),
      }),
    )
    .toHaveAttribute("form", "reset-voice");
});

for (const theme of THEME_IDS) {
  for (const mode of ["light", "dark"]) {
    test(`read-only Markdown fits a narrow phone in ${theme} ${mode}`, async () => {
      await setViewport(NARROWEST_VIEWPORT);
      applyTheme(theme, mode);
      await render(
        <PromptPartFields
          editable={false}
          fields={[
            ...activityPartFields(projectBreakdown.parts),
            PLACEHOLDER_PART,
          ]}
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
