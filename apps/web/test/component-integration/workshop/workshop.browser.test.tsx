import type { ComponentProps } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { keepLocalDraft } from "@/components/local-draft.ts";
import { PromptEditor } from "@/components/prompt-editor.tsx";
import { SiteHeader, TrailBand } from "@/components/site-header.tsx";
import { Workshop } from "@/components/workshop/workshop.tsx";
import { PROMPT_KINDS } from "@/prompts/prompt.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

vi.mock("next/navigation", () => import("../components/router-test-kit.ts"));
vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

const PROMPT = "Offer one small experiment.";
const PROMPT_ONLY: ComponentProps<typeof PromptEditor>["texts"] = [
  { name: "prompt", text: PROMPT, label: "Prompt", help: "Instructions." },
];
const EDITOR_SECTIONS: ComponentProps<typeof PromptEditor>["texts"] = [
  {
    name: "prompt",
    text: PROMPT,
    label: "Instructions",
    help: "Voice and habits.",
  },
  {
    name: "visualDescription",
    text: "An owl with amber eyes.",
    label: "Visual description",
    help: "Appearance.",
    requiredMessage: "Describe the construct’s appearance.",
  },
];
const TEST_CONTROL = /try|test/iu;
const MINIMUM_EDITING_HEIGHT = 44;
// From Save's top to the screen's foot: a target's height, with the empty
// status line's gap and the bar's padding.
const PHONE_SAVE_BAR_MAX_PX = 64;
const saveAction = vi.fn<(data: FormData) => Promise<never>>();
const fetchSpy = vi.fn<typeof fetch>();

async function show(
  texts: ComponentProps<typeof PromptEditor>["texts"] = PROMPT_ONLY,
): Promise<void> {
  await render(
    <>
      <SiteHeader
        links={
          <TrailBand
            items={[
              { label: "Workshop", href: "/workshop" },
              { label: "My construct" },
            ]}
          />
        }
      />
      {inWorkspace(
        <Workshop kind="construct">
          <PromptEditor
            action={saveAction}
            defaultPrompt="Default instructions."
            heading="Prompt"
            idName="constructId"
            kind="construct"
            name="My construct"
            promptId="vellum"
            savedAt="2026-11-04T00:00:00.000Z"
            viewer="workshop-test"
            texts={texts}
          />
        </Workshop>,
      )}
    </>,
  );
}
function submission(): Promise<FormData> {
  const submitted = Promise.withResolvers<FormData>();
  saveAction.mockImplementation((data) => {
    submitted.resolve(data);
    return new Promise<never>(() => undefined);
  });
  return submitted.promise;
}

beforeEach(() => {
  applyTheme("parchment");
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(async () => {
  await setViewport(LAPTOP_VIEWPORT);
  vi.unstubAllGlobals();
  fetchSpy.mockReset();
  saveAction.mockReset();
  localStorage.clear();
});

test("use_case_workshop_editor", async () => {
  await show(EDITOR_SECTIONS);
  const submitted = submission();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Renamed construct");
  await page
    .getByRole("textbox", { name: "Instructions", exact: true })
    .fill("Ask one useful question.");
  await page
    .getByRole("button", { name: "Visual description", exact: true })
    .click();
  await expect
    .element(page.getByRole("textbox", { name: "Instructions", exact: true }))
    .not.toBeInTheDocument();
  await page
    .getByRole("textbox", { name: "Visual description", exact: true })
    .fill("An owl holding a notebook.");
  await page.getByRole("button", { name: "Instructions", exact: true }).click();
  await expect
    .element(page.getByRole("textbox", { name: "Instructions", exact: true }))
    .toHaveValue("Ask one useful question.");
  await page
    .getByRole("button", { name: PROMPT_COPY.save, exact: true })
    .click();
  const form = await submitted;
  expect(form.get("name")).toBe("Renamed construct");
  expect(form.get("prompt")).toBe("Ask one useful question.");
  expect(form.get("visualDescription")).toBe("An owl holding a notebook.");
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("the Workshop offers no test conversation", async () => {
  await show();
  await expect
    .element(page.getByRole("button", { name: TEST_CONTROL }))
    .not.toBeInTheDocument();
  await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
});

test("a recovered editor draft is shown and saved", async () => {
  keepLocalDraft("prompt:workshop-test:buddy:vellum", {
    basedOn: "2026-11-04T00:00:00.000Z",
    name: "Recovered construct",
    texts: { prompt: "Recovered instructions." },
  });
  await show();
  await expect
    .element(page.getByRole("textbox", { name: "Prompt", exact: true }))
    .toHaveValue("Recovered instructions.");
  const submitted = submission();
  await page
    .getByRole("button", { name: PROMPT_COPY.save, exact: true })
    .click();
  const form = await submitted;
  expect(form.get("name")).toBe("Recovered construct");
  expect(form.get("prompt")).toBe("Recovered instructions.");
});

test("saving reveals and focuses an invalid field in another section", async () => {
  await show(EDITOR_SECTIONS);
  await page
    .getByRole("button", { name: "Visual description", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Visual description", exact: true })
    .fill("");
  await page.getByRole("button", { name: "Instructions", exact: true }).click();
  await page
    .getByRole("button", { name: PROMPT_COPY.save, exact: true })
    .click();
  await expect
    .element(
      page.getByRole("textbox", { name: "Visual description", exact: true }),
    )
    .toHaveFocus();
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("Describe the construct’s appearance.");
  expect(saveAction).not.toHaveBeenCalled();
});

test.each([
  { width: 844, height: 390 },
  { width: 320, height: 180 },
])(
  "short editor viewport leaves focused text unobstructed at $width by $height",
  async (viewport) => {
    await setViewport(viewport);
    await show();
    const prompt = page.getByRole("textbox", { name: "Prompt", exact: true });
    prompt.element().scrollIntoView({ block: "center" });
    prompt.element().focus();
    await userEvent.keyboard("Edited ");
    await expect.element(prompt).toHaveFocus();
    const rect = prompt.element().getBoundingClientRect();
    const saveRect = page
      .getByRole("button", { name: PROMPT_COPY.save, exact: true })
      .element()
      .getBoundingClientRect();
    const bandBottom = page
      .getByRole("banner")
      .getByRole("heading", { level: 1 })
      .element()
      .getBoundingClientRect().bottom;
    const visibleTop = Math.max(0, rect.top, bandBottom);
    const visibleBottom = Math.min(
      window.innerHeight,
      rect.bottom,
      saveRect.top,
    );
    expect(visibleBottom - visibleTop).toBeGreaterThanOrEqual(
      MINIMUM_EDITING_HEIGHT,
    );
    await expect
      .poll(() =>
        document.elementFromPoint(
          rect.left + rect.width / 2,
          (visibleTop + visibleBottom) / 2,
        ),
      )
      .toBe(prompt.element());
  },
);

test.each([{ width: 360, height: 700 }, NARROWEST_VIEWPORT])(
  "a phone pins Save in one short row, with Reset and Discard below it, while editing at $width px",
  async (viewport) => {
    await setViewport(viewport);
    await show();
    const prompt = page.getByRole("textbox", { name: "Prompt", exact: true });
    await prompt.fill("An edited prompt");
    window.scrollTo({ top: 0, behavior: "instant" });
    await expect.poll(() => window.scrollY).toBe(0);
    const save = page
      .getByRole("button", { name: PROMPT_COPY.save, exact: true })
      .element()
      .getBoundingClientRect();
    expect(save.bottom).toBeLessThanOrEqual(window.innerHeight);
    expect(window.innerHeight - save.top).toBeLessThanOrEqual(
      PHONE_SAVE_BAR_MAX_PX,
    );
    for (const name of [PROMPT_COPY.resetPrompt, PROMPT_COPY.discard]) {
      expect(
        page.getByRole("button", { name }).element().getBoundingClientRect()
          .top,
      ).toBeGreaterThanOrEqual(window.innerHeight);
    }
  },
);

test("name-first validation marks hidden errors and reset reveals only the prompt", async () => {
  await show(EDITOR_SECTIONS);
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("");
  await page
    .getByRole("button", { name: "Visual description", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Visual description", exact: true })
    .fill("");
  await page.getByRole("button", { name: "Instructions", exact: true }).click();
  await page
    .getByRole("button", { name: PROMPT_COPY.save, exact: true })
    .click();
  await expect
    .element(page.getByRole("textbox", { name: "Name", exact: true }))
    .toHaveFocus();
  const errorSection = page.getByRole("button", {
    name: `Visual description${PROMPT_COPY.sectionError}`,
    exact: true,
  });
  await expect.element(errorSection).toBeVisible();
  await errorSection.click();
  await expect
    .element(
      page
        .getByRole("alert")
        .filter({ hasText: "Describe the construct’s appearance." }),
    )
    .toBeVisible();
  await page
    .getByRole("textbox", { name: "Visual description", exact: true })
    .fill("Keep this appearance.");
  await expect
    .element(
      page.getByRole("button", { name: "Visual description", exact: true }),
    )
    .toBeVisible();
  await page.getByRole("button", { name: PROMPT_COPY.resetPrompt }).click();
  await expect
    .element(page.getByRole("textbox", { name: "Instructions", exact: true }))
    .toHaveFocus();
  await expect
    .element(page.getByRole("textbox", { name: "Instructions", exact: true }))
    .toHaveValue("Default instructions.");
  await page
    .getByRole("button", { name: "Visual description", exact: true })
    .click();
  await expect
    .element(
      page.getByRole("textbox", { name: "Visual description", exact: true }),
    )
    .toHaveValue("Keep this appearance.");
  expect(saveAction).not.toHaveBeenCalled();
});

test.each(PROMPT_KINDS)(
  "the %s editor returns to its Workshop collection",
  async (kind) => {
    await render(<Workshop kind={kind}>{PROMPT}</Workshop>);
    const href = page
      .getByRole("link", { name: "Workshop", exact: true })
      .element()
      .getAttribute("href");
    expect(href).not.toBeNull();
    const destination = new URL(href ?? "", globalThis.location.origin);
    expect(destination.pathname).toBe("/workshop");
    expect(destination.searchParams.get("kind") ?? "construct").toBe(kind);
  },
);
