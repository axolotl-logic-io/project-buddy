import type { ComponentProps } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { keepLocalDraft } from "@/components/local-draft.ts";
import { PromptEditor } from "@/components/prompt-editor.tsx";
import { Breadcrumbs, SiteHeader } from "@/components/site-header.tsx";
import { Workshop } from "@/components/workshop/workshop.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { BATTERY_PURCHASES_COPY } from "@/ui/copy/battery-purchases.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";
import {
  WORKSHOP_REQUEST,
  type WorkshopDraft,
  type WorkshopRequest,
} from "@/workshop/protocol.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { refresh } from "../components/router-test-kit.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

vi.mock("next/navigation", () => import("../components/router-test-kit.ts"));
vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

const DRAFT: WorkshopDraft = {
  kind: "construct",
  id: "vellum",
  name: "My construct",
  prompt: "Offer one small experiment.",
  whenToUse: "",
  openingRequest: "",
};
const OPTIONS = {
  constructs: [{ id: "vellum", name: "Vellum" }],
  activities: [
    { id: "open-chat", name: "Chat" },
    { id: "brainstorming", name: "Brainstorm" },
  ],
};
const LONG_REPLY_PARAGRAPHS = 100;
const MINIMUM_EDITING_HEIGHT = 44;
const requests: WorkshopRequest[] = [];
const saveAction = vi.fn<(data: FormData) => Promise<never>>();

function installReply(): void {
  requests.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init: RequestInit): Promise<Response> => {
      const body: unknown = JSON.parse(String(init.body));
      requests.push(WORKSHOP_REQUEST.parse(body));
      return Promise.resolve(
        Response.json({ text: "Try a tiny prototype.", casts: [] }),
      );
    }),
  );
}
async function show(
  draft: WorkshopDraft = DRAFT,
  texts: ComponentProps<typeof PromptEditor>["texts"] = [
    {
      name: "prompt",
      text: draft.prompt,
      label: "Prompt",
      help: "Instructions to test.",
    },
    {
      name: "whenToUse",
      text: draft.whenToUse,
      label: "When to use",
      help: "Selection",
    },
    {
      name: "openingRequest",
      text: draft.openingRequest,
      label: "Opening request",
      help: "Opening",
    },
  ].filter(
    (field) =>
      field.name === "prompt" ||
      (field.name === "whenToUse" && draft.kind === "spell") ||
      (field.name === "openingRequest" && draft.kind === "activity"),
  ),
  pinned = false,
): Promise<void> {
  await render(
    <>
      {pinned === true && (
        <SiteHeader
          links={
            <Breadcrumbs
              items={[
                { label: "Workshop", href: "/workshop" },
                { label: DRAFT.name },
              ]}
            />
          }
        />
      )}
      {inWorkspace(
        <Workshop initial={draft} options={OPTIONS}>
          <PromptEditor
            action={saveAction}
            defaultPrompt="Default instructions."
            heading="Prompt"
            idName="constructId"
            kind={draft.kind}
            name={draft.name}
            promptId={draft.id}
            savedAt="2026-11-04T00:00:00.000Z"
            viewer="workshop-test"
            texts={texts}
          />
        </Workshop>,
      )}
    </>,
  );
  await openTests();
}
async function openTests(): Promise<void> {
  await page
    .getByRole("button", { name: WORKSHOP_COPY.test, exact: true })
    .click();
}
async function closeTests(): Promise<void> {
  await page.getByRole("button", { name: WORKSHOP_COPY.close }).click();
}
function message(): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: WORKSHOP_COPY.message });
}
beforeEach(() => {
  applyTheme("parchment");
});

afterEach(async () => {
  await setViewport(LAPTOP_VIEWPORT);
  vi.unstubAllGlobals();
  saveAction.mockReset();
  refresh.mockClear();
  localStorage.clear();
});

test("use_case_workshop_draft", async () => {
  installReply();
  await show();
  await closeTests();
  await page
    .getByRole("textbox", { name: "Prompt", exact: true })
    .fill("Ask one short question.");
  await openTests();
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(requests[0]?.draft.prompt).toBe("Ask one short question.");
  expect(requests[0]?.history).toEqual([]);
  await message().fill("A follow-up");
  await page.getByRole("button", { name: WORKSHOP_COPY.followUp }).click();
  await expect.element(message()).toHaveValue("");
  expect(requests.at(-1)?.history).toHaveLength(2);
  await closeTests();
  await page
    .getByRole("textbox", { name: "Prompt", exact: true })
    .fill("Offer two choices.");
  await openTests();
  await expect.element(page.getByText(WORKSHOP_COPY.stale)).toBeVisible();
  await message().fill("Try the revision");
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(page.getByText(WORKSHOP_COPY.version(2))).toBeVisible();
  expect(requests.at(-1)?.history).toEqual([]);
  expect(requests.at(-1)?.draft.prompt).toBe("Offer two choices.");
});

test("test cases and companion changes start a new conversation", async () => {
  installReply();
  await show();
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
  await message().fill("Unsent follow-up");
  const firstExample = page.getByRole("button", {
    name: WORKSHOP_COPY.examples[0].name,
    exact: true,
  });
  firstExample.element().focus();
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.keyboard("{ArrowUp}");
  await expect.element(message()).toHaveValue("Unsent follow-up");
  await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
  await userEvent.tab();
  await expect
    .element(
      page.getByRole("button", {
        name: WORKSHOP_COPY.examples[1].name,
        exact: true,
      }),
    )
    .toHaveFocus();
  await userEvent.keyboard("{Enter}");
  await expect
    .element(message())
    .toHaveValue(WORKSHOP_COPY.examples[1].message);
  await expect.element(page.getByText(WORKSHOP_COPY.empty)).toBeVisible();
  await userEvent.tab();
  await expect
    .element(
      page.getByRole("button", {
        name: WORKSHOP_COPY.examples[2].name,
        exact: true,
      }),
    )
    .toHaveFocus();
  await userEvent.keyboard(" ");
  await expect
    .element(message())
    .toHaveValue(WORKSHOP_COPY.examples[2].message);
  await page
    .getByRole("combobox", { name: WORKSHOP_COPY.activity })
    .selectOptions("brainstorming");
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
  expect(requests.at(-1)?.activityId).toBe("brainstorming");
  expect(requests.at(-1)?.history).toEqual([]);
});

test("an activity can test its opening without a user message", async () => {
  installReply();
  await show({
    ...DRAFT,
    kind: "activity",
    id: "brainstorming",
    openingRequest: "Ask what I want to explore.",
  });
  await message().fill("");
  await page.getByRole("button", { name: WORKSHOP_COPY.opening }).click();
  await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
  expect(requests[0]?.opening).toBe(true);
  expect(requests[0]?.draft.openingRequest).toBe("Ask what I want to explore.");
});

test("spell selection and forced casts are distinct test settings", async () => {
  installReply();
  await show({
    ...DRAFT,
    kind: "spell",
    id: "ask-one-question",
    whenToUse: "When planning.",
  });
  await page
    .getByRole("combobox", { name: WORKSHOP_COPY.spell, exact: true })
    .selectOptions("true");
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
  expect(requests[0]?.forceCast).toBe(true);
});

test("gold failures preserve the test message for retry", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (): Promise<Response> =>
        new Response("out-of-gold", { status: 429 }),
    ),
  );
  await show();
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.poll(() => refresh.mock.calls.length).toBe(1);
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent(
      `${userMessage("out-of-gold")} ${BATTERY_PURCHASES_COPY.unavailable}`,
    );
  await expect
    .element(page.getByRole("alert").getByRole("link"))
    .not.toBeInTheDocument();
  await expect
    .element(message())
    .toHaveValue(WORKSHOP_COPY.examples[0].message);
});

test.each([WORKSHOP_COPY.fresh, WORKSHOP_COPY.cancel])(
  "%s stops waiting and announces the possible spend",
  async (label) => {
    const completed = Promise.withResolvers<Response>();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => completed.promise),
    );
    await show();
    await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
    await expect.element(page.getByText(WORKSHOP_COPY.pending)).toBeVisible();
    await expect
      .element(page.getByText(WORKSHOP_COPY.cancelHint))
      .toBeVisible();
    await closeTests();
    expect(refresh).not.toHaveBeenCalled();
    await openTests();
    await expect.element(page.getByText(WORKSHOP_COPY.pending)).toBeVisible();
    await expect
      .element(message())
      .toHaveValue(WORKSHOP_COPY.examples[0].message);
    await page.getByRole("button", { name: label, exact: true }).click();
    expect(refresh).not.toHaveBeenCalled();
    await expect
      .element(
        page.getByRole("status").filter({ hasText: WORKSHOP_COPY.cancelled }),
      )
      .toBeVisible();
    await expect
      .element(message())
      .toHaveValue(WORKSHOP_COPY.examples[0].message);
    await expect
      .element(page.getByRole("button", { name: WORKSHOP_COPY.send }))
      .toBeEnabled();
    await expect.element(page.getByText(WORKSHOP_COPY.empty)).toBeVisible();
    completed.resolve(Response.json({ text: "Discarded reply", casts: [] }));
    await expect.poll(() => refresh.mock.calls.length).toBe(1);
    await expect
      .element(page.getByText("Discarded reply"))
      .not.toBeInTheDocument();
  },
);

test("reset, undo and discard update the draft tested by the Workshop", async () => {
  installReply();
  await show();
  await closeTests();
  const prompt = page.getByRole("textbox", { name: "Prompt", exact: true });
  await prompt.fill("Unsaved instructions.");
  await page.getByRole("button", { name: PROMPT_COPY.resetPrompt }).click();
  await openTests();
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
  expect(requests.at(-1)?.draft.prompt).toBe("Default instructions.");
  await closeTests();
  await page.getByRole("button", { name: PROMPT_COPY.undoReset }).click();
  await openTests();
  await expect.element(page.getByText(WORKSHOP_COPY.stale)).toBeVisible();
  await message().fill("Try undo");
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(message()).toHaveValue("");
  expect(requests.at(-1)?.draft.prompt).toBe("Unsaved instructions.");
  await closeTests();
  await page.getByRole("button", { name: PROMPT_COPY.discard }).click();
  await openTests();
  await message().fill("Try saved");
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(message()).toHaveValue("");
  expect(requests.at(-1)?.draft.prompt).toBe(DRAFT.prompt);
});

test("a recovered editor draft is used by the first Workshop test", async () => {
  installReply();
  keepLocalDraft("prompt:workshop-test:buddy:vellum", {
    basedOn: "2026-11-04T00:00:00.000Z",
    name: "Recovered construct",
    texts: { prompt: "Recovered instructions." },
  });
  await show();
  await closeTests();
  await expect
    .element(page.getByRole("textbox", { name: "Prompt", exact: true }))
    .toHaveValue("Recovered instructions.");
  await openTests();
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
  expect(requests.at(-1)?.draft.prompt).toBe("Recovered instructions.");
  expect(requests.at(-1)?.draft.name).toBe("Recovered construct");
});

test("closing the drawer preserves the test and restores keyboard focus", async () => {
  installReply();
  await show();
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
  await message().fill("Keep this follow-up");
  await userEvent.keyboard("{Escape}");
  await expect
    .element(page.getByRole("dialog", { name: WORKSHOP_COPY.test }))
    .not.toBeInTheDocument();
  await expect
    .element(
      page.getByRole("button", { name: WORKSHOP_COPY.test, exact: true }),
    )
    .toHaveFocus();
  await page
    .getByRole("textbox", { name: "Prompt", exact: true })
    .fill("A revised draft");
  await openTests();
  await expect.element(message()).toHaveValue("Keep this follow-up");
  await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
  await expect.element(page.getByText(WORKSHOP_COPY.stale)).toBeVisible();
  expect(saveAction).not.toHaveBeenCalled();
  expect(requests).toHaveLength(1);
});

test.each([LAPTOP_VIEWPORT, NARROWEST_VIEWPORT, PHONE_VIEWPORT])(
  "long test replies keep the composer within the viewport at $width px",
  async (viewport) => {
    await setViewport(viewport);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (): Promise<Response> =>
          Response.json({
            text: "A long reply.\n\n".repeat(LONG_REPLY_PARAGRAPHS),
            casts: [],
          }),
      ),
    );
    await show();
    await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
    await expect.element(message()).toHaveValue("");
    const dialog = page
      .getByRole("dialog", { name: WORKSHOP_COPY.test })
      .element();
    const send = page
      .getByRole("button", { name: WORKSHOP_COPY.followUp })
      .element()
      .getBoundingClientRect();
    const composer = message().element().getBoundingClientRect();
    expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth);
    expect(composer.top).toBeGreaterThanOrEqual(0);
    expect(composer.bottom).toBeLessThanOrEqual(window.innerHeight);
    expect(send.bottom).toBeLessThanOrEqual(window.innerHeight);
  },
);

const EDITOR_SECTIONS: ComponentProps<typeof PromptEditor>["texts"] = [
  {
    name: "prompt",
    text: DRAFT.prompt,
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

test("switching editor sections preserves every field when saving", async () => {
  await show(DRAFT, EDITOR_SECTIONS);
  await closeTests();
  const submitted = Promise.withResolvers<FormData>();
  saveAction.mockImplementation((data) => {
    submitted.resolve(data);
    return new Promise<never>(() => undefined);
  });
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
  const form = await submitted.promise;
  expect(form.get("prompt")).toBe("Ask one useful question.");
  expect(form.get("visualDescription")).toBe("An owl holding a notebook.");
});

test("saving reveals and focuses an invalid field in another section", async () => {
  await show(DRAFT, EDITOR_SECTIONS);
  await closeTests();
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

test.each([PHONE_VIEWPORT, NARROWEST_VIEWPORT])(
  "the drawer stays above a visual-only keyboard at $width px",
  async (screen) => {
    const keyboardHeight = 420;
    await setViewport(screen);
    const viewport = Object.assign(new EventTarget(), {
      height: screen.height,
      offsetTop: 0,
    });
    vi.stubGlobal("visualViewport", viewport);
    const reply = Promise.withResolvers<Response>();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => reply.promise),
    );
    await show();
    viewport.height = keyboardHeight;
    viewport.dispatchEvent(new Event("resize"));
    await expect
      .poll(() => message().element().getBoundingClientRect().bottom)
      .toBeLessThanOrEqual(keyboardHeight);
    await expect
      .poll(
        () =>
          page
            .getByRole("button", { name: WORKSHOP_COPY.send })
            .element()
            .getBoundingClientRect().bottom,
      )
      .toBeLessThanOrEqual(keyboardHeight);
    await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
    await expect
      .element(page.getByText(WORKSHOP_COPY.pending))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: WORKSHOP_COPY.cancel }))
      .toBeInViewport({ ratio: 1 });
    await closeTests();
    await openTests();
    await expect
      .poll(() => message().element().getBoundingClientRect().bottom)
      .toBeLessThanOrEqual(keyboardHeight);
    reply.resolve(Response.json({ text: "Try a prototype.", casts: [] }));
    await expect
      .element(page.getByText("Try a prototype."))
      .toBeInTheDocument();
    await message().fill("Help me choose the prototype.");
    await expect
      .element(page.getByRole("button", { name: WORKSHOP_COPY.followUp }))
      .toBeEnabled();
  },
);
test.each(["construct", "activity", "spell"] as const)(
  "%s tests current kind-specific edits without saving",
  async (kind) => {
    installReply();
    await show({ ...DRAFT, kind });
    await closeTests();
    await page
      .getByRole("textbox", { name: "Name", exact: true })
      .fill("Unsaved name");
    await page
      .getByRole("textbox", { name: "Prompt", exact: true })
      .fill("Unsaved prompt");
    if (kind === "spell") {
      await page
        .getByRole("button", { name: "When to use", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "When to use", exact: true })
        .fill("Unsaved selection");
    }
    if (kind === "activity") {
      await page
        .getByRole("button", { name: "Opening request", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Opening request", exact: true })
        .fill("Unsaved opening");
    }
    await openTests();
    await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
    await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
    expect(requests.at(-1)?.draft).toMatchObject({
      kind,
      name: "Unsaved name",
      prompt: "Unsaved prompt",
    });
    const expected: Partial<WorkshopDraft> = {};
    if (kind === "spell") {
      expected.whenToUse = "Unsaved selection";
    }
    if (kind === "activity") {
      expected.openingRequest = "Unsaved opening";
    }
    expect(requests.at(-1)?.draft).toMatchObject(expected);
    expect(saveAction).not.toHaveBeenCalled();
  },
);

test("the test drawer action stays below pinned breadcrumbs while scrolling", async () => {
  await render(
    <>
      <SiteHeader
        links={
          <Breadcrumbs
            items={[
              { label: "Workshop", href: "/workshop" },
              { label: DRAFT.name },
            ]}
          />
        }
      />
      {inWorkspace(
        <Workshop initial={DRAFT} options={OPTIONS}>
          <p className="whitespace-pre-wrap">
            {`${DRAFT.prompt}\n\n`.repeat(LONG_REPLY_PARAGRAPHS)}
          </p>
        </Workshop>,
      )}
    </>,
  );
  window.scrollTo({ top: window.innerHeight, behavior: "instant" });
  const breadcrumbs = page.getByRole("navigation", { name: "Breadcrumbs" });
  const testButton = page.getByRole("button", {
    name: WORKSHOP_COPY.test,
    exact: true,
  });
  await expect.poll(() => window.scrollY).toBeGreaterThan(0);
  await expect
    .poll(
      () =>
        testButton.element().getBoundingClientRect().top -
        breadcrumbs.element().getBoundingClientRect().bottom,
    )
    .toBeGreaterThanOrEqual(0);
  await expect.element(testButton).toBeInViewport({ ratio: 1 });
  await testButton.click();
  await expect
    .element(page.getByRole("dialog", { name: WORKSHOP_COPY.test }))
    .toBeVisible();
});

test.each([
  { width: 844, height: 390 },
  { width: 320, height: 180 },
])(
  "short editor viewport leaves focused text unobstructed at $width by $height",
  async (viewport) => {
    await setViewport(viewport);
    await show(DRAFT, undefined, true);
    await closeTests();
    const prompt = page.getByRole("textbox", { name: "Prompt", exact: true });
    prompt.element().scrollIntoView({ block: "center" });
    prompt.element().focus();
    await userEvent.keyboard("Edited ");
    await expect.element(prompt).toHaveFocus();
    const rect = prompt.element().getBoundingClientRect();
    const toolbar = page
      .getByRole("button", { name: WORKSHOP_COPY.test, exact: true })
      .element()
      .closest("header");
    const save = page
      .getByRole("button", { name: PROMPT_COPY.save, exact: true })
      .element();
    const toolbarRect = toolbar?.getBoundingClientRect();
    const saveRect = save.getBoundingClientRect();
    const breadcrumbsBottom = page
      .getByRole("navigation", { name: "Breadcrumbs" })
      .element()
      .getBoundingClientRect().bottom;
    const visibleTop = Math.max(
      0,
      rect.top,
      toolbarRect?.bottom ?? 0,
      breadcrumbsBottom,
    );
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

test("failed follow-ups and pending controls remain visible after a long conversation", async () => {
  await setViewport(PHONE_VIEWPORT);
  const followUp = Promise.withResolvers<Response>();
  const retry = Promise.withResolvers<Response>();
  const fetchReply = vi
    .fn<() => Promise<Response>>()
    .mockResolvedValueOnce(
      Response.json({
        text: "Long conversation.\n\n".repeat(LONG_REPLY_PARAGRAPHS),
        casts: [],
      }),
    )
    .mockImplementationOnce(() => followUp.promise)
    .mockImplementation(() => retry.promise);
  vi.stubGlobal("fetch", fetchReply);
  await show();
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(message()).toHaveValue("");
  await message().fill("Keep my failed follow-up");
  await userEvent.tab();
  await userEvent.keyboard("{Enter}");
  await expect
    .element(page.getByText(WORKSHOP_COPY.pending))
    .toBeInViewport({ ratio: 1 });
  await expect
    .element(page.getByText(WORKSHOP_COPY.cancelHint))
    .toBeInViewport({ ratio: 1 });
  const cancel = page.getByRole("button", {
    name: WORKSHOP_COPY.cancel,
    exact: true,
  });
  await expect.element(cancel).toBeInViewport({ ratio: 1 });
  cancel.element().focus();
  await expect.element(cancel).toHaveFocus();
  followUp.resolve(new Response("out-of-gold", { status: 429 }));
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent(
      `${userMessage("out-of-gold")} ${BATTERY_PURCHASES_COPY.unavailable}`,
    );
  await expect.element(page.getByRole("alert")).toBeInViewport({ ratio: 1 });
  await expect.element(message()).toHaveValue("Keep my failed follow-up");
  expect(refresh).toHaveBeenCalledTimes(2);
  expect(fetchReply).toHaveBeenCalledTimes(2);
  await message().click();
  await userEvent.tab();
  await userEvent.keyboard("{Enter}");
  await expect
    .element(page.getByText(WORKSHOP_COPY.pending))
    .toBeInViewport({ ratio: 1 });
  cancel.element().focus();
  await userEvent.keyboard("{Enter}");
  await expect
    .element(page.getByText(WORKSHOP_COPY.cancelled))
    .toBeInViewport({ ratio: 1 });
  await expect.element(message()).toHaveValue("Keep my failed follow-up");
  retry.resolve(
    Response.json({ text: "Discard this late follow-up", casts: [] }),
  );
  await expect
    .poll(() => refresh.mock.calls.length)
    .toBe(fetchReply.mock.calls.length);
  await expect
    .element(page.getByText("Discard this late follow-up"))
    .not.toBeInTheDocument();
});

test("name-first validation marks hidden errors and reset reveals only the prompt", async () => {
  await show(DRAFT, EDITOR_SECTIONS);
  await closeTests();
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
