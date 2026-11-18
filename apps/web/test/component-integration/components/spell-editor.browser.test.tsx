import type { ComponentProps } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { keepLocalDraft } from "@/components/local-draft.ts";
import { PromptEditor } from "@/components/prompt-editor.tsx";
import { SiteHeader, TrailBand } from "@/components/site-header.tsx";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

// The header's ring of the user's circle reads their experience, server code.
vi.mock(
  "@/experience/experience-store.ts",
  () => import("../experience/experience-store-test-kit.ts"),
);

vi.mock("next/navigation", () => import("../components/router-test-kit.ts"));
vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

const REQUIRED_REPLY = "Write a reply.";
const PROMPT = "Offer one small experiment.";
const PROMPT_ONLY: ComponentProps<typeof PromptEditor>["texts"] = [
  {
    name: "prompt",
    text: PROMPT,
    label: "Spell Messages",
    help: "Reply when cast.",
  },
];
const EDITOR_SECTIONS: ComponentProps<typeof PromptEditor>["texts"] = [
  {
    name: "prompt",
    text: PROMPT,
    label: "Reply when cast",
    help: "Casting replies.",
  },
  {
    name: "stopReply",
    text: "An owl with amber eyes.",
    label: "Reply when stopped",
    help: "Stopping replies.",
    requiredMessage: REQUIRED_REPLY,
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
        trail={
          <TrailBand
            items={[
              { label: "Spellbook", href: "/spellbook" },
              { label: "My spell" },
            ]}
          />
        }
      />
      {inWorkspace(
        <section className="definition-editor">
          <PromptEditor
            action={saveAction}
            heading="Spell Messages"
            idName="spellId"
            kind="spell"
            name="My spell"
            promptId="tasks"
            savedAt="2026-11-04T00:00:00.000Z"
            viewer="spellbook-test"
            texts={texts}
          />
        </section>,
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

test("spell editor submits every section", async () => {
  await show(EDITOR_SECTIONS);
  const submitted = submission();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Renamed spell");
  await page
    .getByRole("textbox", {
      name: SPELLBOOK_COPY.responses.castReply,
      exact: true,
    })
    .fill("Ask one useful question.");
  await page
    .getByRole("button", {
      name: SPELLBOOK_COPY.responses.stopReply,
      exact: true,
    })
    .click();
  await expect
    .element(
      page.getByRole("textbox", {
        name: SPELLBOOK_COPY.responses.castReply,
        exact: true,
      }),
    )
    .not.toBeInTheDocument();
  await page
    .getByRole("textbox", {
      name: SPELLBOOK_COPY.responses.stopReply,
      exact: true,
    })
    .fill("An owl holding a notebook.");
  await page
    .getByRole("button", {
      name: SPELLBOOK_COPY.responses.castReply,
      exact: true,
    })
    .click();
  await expect
    .element(
      page.getByRole("textbox", {
        name: SPELLBOOK_COPY.responses.castReply,
        exact: true,
      }),
    )
    .toHaveValue("Ask one useful question.");
  await page
    .getByRole("button", { name: PROMPT_COPY.save, exact: true })
    .click();
  const form = await submitted;
  expect(form.get("name")).toBe("Renamed spell");
  expect(form.get("prompt")).toBe("Ask one useful question.");
  expect(form.get("stopReply")).toBe("An owl holding a notebook.");
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("the Spellbook offers no test conversation", async () => {
  await show();
  await expect
    .element(page.getByRole("button", { name: TEST_CONTROL }))
    .not.toBeInTheDocument();
  await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
});

test("a recovered editor draft is shown and saved", async () => {
  keepLocalDraft("prompt:spellbook-test:spell:tasks", {
    basedOn: "2026-11-04T00:00:00.000Z",
    name: "Recovered spell",
    texts: { prompt: "Recovered replies." },
  });
  await show();
  await expect
    .element(
      page.getByRole("textbox", { name: SPELLBOOK_COPY.settings, exact: true }),
    )
    .toHaveValue("Recovered replies.");
  const submitted = submission();
  await page
    .getByRole("button", { name: PROMPT_COPY.save, exact: true })
    .click();
  const form = await submitted;
  expect(form.get("name")).toBe("Recovered spell");
  expect(form.get("prompt")).toBe("Recovered replies.");
});

test("saving reveals and focuses an invalid field in another section", async () => {
  await show(EDITOR_SECTIONS);
  await page
    .getByRole("button", {
      name: SPELLBOOK_COPY.responses.stopReply,
      exact: true,
    })
    .click();
  await page
    .getByRole("textbox", {
      name: SPELLBOOK_COPY.responses.stopReply,
      exact: true,
    })
    .fill("");
  await page
    .getByRole("button", {
      name: SPELLBOOK_COPY.responses.castReply,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: PROMPT_COPY.save, exact: true })
    .click();
  await expect
    .element(
      page.getByRole("textbox", {
        name: SPELLBOOK_COPY.responses.stopReply,
        exact: true,
      }),
    )
    .toHaveFocus();
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent(REQUIRED_REPLY);
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
    const prompt = page.getByRole("textbox", {
      name: SPELLBOOK_COPY.settings,
      exact: true,
    });
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
  "a phone pins Save in one short row, with Cancel below it, while editing at $width px",
  async (viewport) => {
    await setViewport(viewport);
    await show();
    const prompt = page.getByRole("textbox", {
      name: SPELLBOOK_COPY.settings,
      exact: true,
    });
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
    for (const name of [PROMPT_COPY.discard]) {
      expect(
        page.getByRole("button", { name }).element().getBoundingClientRect()
          .top,
      ).toBeGreaterThanOrEqual(window.innerHeight);
    }
  },
);

test("name-first validation marks hidden errors without losing edits in other sections", async () => {
  await show(EDITOR_SECTIONS);
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("");
  await page
    .getByRole("button", {
      name: SPELLBOOK_COPY.responses.stopReply,
      exact: true,
    })
    .click();
  await page
    .getByRole("textbox", {
      name: SPELLBOOK_COPY.responses.stopReply,
      exact: true,
    })
    .fill("");
  await page
    .getByRole("button", {
      name: SPELLBOOK_COPY.responses.castReply,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: PROMPT_COPY.save, exact: true })
    .click();
  await expect
    .element(page.getByRole("textbox", { name: "Name", exact: true }))
    .toHaveFocus();
  const errorSection = page.getByRole("button", {
    name: `Reply when stopped${PROMPT_COPY.sectionError}`,
    exact: true,
  });
  await expect.element(errorSection).toBeVisible();
  await errorSection.click();
  await expect
    .element(page.getByRole("alert").filter({ hasText: REQUIRED_REPLY }))
    .toBeVisible();
  await page
    .getByRole("textbox", {
      name: SPELLBOOK_COPY.responses.stopReply,
      exact: true,
    })
    .fill("Keep this appearance.");
  await expect
    .element(
      page.getByRole("button", {
        name: SPELLBOOK_COPY.responses.stopReply,
        exact: true,
      }),
    )
    .toBeVisible();
  await page
    .getByRole("button", {
      name: SPELLBOOK_COPY.responses.castReply,
      exact: true,
    })
    .click();
  await expect
    .element(
      page.getByRole("textbox", {
        name: SPELLBOOK_COPY.responses.castReply,
        exact: true,
      }),
    )
    .toHaveValue(PROMPT);
  await page
    .getByRole("button", {
      name: SPELLBOOK_COPY.responses.stopReply,
      exact: true,
    })
    .click();
  await expect
    .element(
      page.getByRole("textbox", {
        name: SPELLBOOK_COPY.responses.stopReply,
        exact: true,
      }),
    )
    .toHaveValue("Keep this appearance.");
  expect(saveAction).not.toHaveBeenCalled();
});
