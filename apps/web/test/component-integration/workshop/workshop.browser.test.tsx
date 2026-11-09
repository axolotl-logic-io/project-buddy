import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { keepLocalDraft } from "@/components/local-draft.ts";
import { PromptEditor } from "@/components/prompt-editor.tsx";
import { Workshop } from "@/components/workshop/workshop.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { MARKETPLACE_COPY } from "@/ui/copy/marketplace.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";
import {
  WORKSHOP_REQUEST,
  type WorkshopDraft,
  type WorkshopRequest,
} from "@/workshop/protocol.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { refresh } from "../components/router-test-kit.ts";

vi.mock("next/navigation", () => import("../components/router-test-kit.ts"));

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
async function show(draft: WorkshopDraft = DRAFT): Promise<void> {
  await render(
    inWorkspace(
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
          texts={[
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
          )}
        />
      </Workshop>,
    ),
  );
}
function message(): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: WORKSHOP_COPY.message });
}
afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockClear();
  localStorage.clear();
  saveAction.mockClear();
});

test("use_case_workshop_draft", async () => {
  installReply();
  await show();
  await page
    .getByRole("textbox", { name: "Prompt", exact: true })
    .fill("Ask one short question.");
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(requests[0]?.draft.prompt).toBe("Ask one short question.");
  expect(requests[0]?.history).toEqual([]);
  await message().fill("A follow-up");
  await page.getByRole("button", { name: WORKSHOP_COPY.followUp }).click();
  await expect.element(message()).toHaveValue("");
  expect(requests.at(-1)?.history).toHaveLength(2);
  await page
    .getByRole("textbox", { name: "Prompt", exact: true })
    .fill("Offer two choices.");
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
  await page
    .getByRole("button", { name: WORKSHOP_COPY.examples[1].name })
    .click();
  await expect
    .element(message())
    .toHaveValue(WORKSHOP_COPY.examples[1].message);
  await expect.element(page.getByText(WORKSHOP_COPY.empty)).toBeVisible();
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
      `${userMessage("out-of-gold")} ${MARKETPLACE_COPY.earnGold}`,
    );
  await expect
    .element(
      page
        .getByRole("alert")
        .getByRole("link", { name: MARKETPLACE_COPY.earnGold }),
    )
    .toHaveAttribute("href", "/marketplace#your-listings");
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
  const prompt = page.getByRole("textbox", { name: "Prompt", exact: true });
  await prompt.fill("Unsaved instructions.");
  await page.getByRole("button", { name: PROMPT_COPY.resetPrompt }).click();
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
  expect(requests.at(-1)?.draft.prompt).toBe("Default instructions.");
  await page.getByRole("button", { name: PROMPT_COPY.undoReset }).click();
  await expect.element(page.getByText(WORKSHOP_COPY.stale)).toBeVisible();
  await message().fill("Try undo");
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(message()).toHaveValue("");
  expect(requests.at(-1)?.draft.prompt).toBe("Unsaved instructions.");
  await page.getByRole("button", { name: PROMPT_COPY.discard }).click();
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
  await expect
    .element(page.getByRole("textbox", { name: "Prompt", exact: true }))
    .toHaveValue("Recovered instructions.");
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
  expect(requests.at(-1)?.draft.prompt).toBe("Recovered instructions.");
  expect(requests.at(-1)?.draft.name).toBe("Recovered construct");
});

test.each(["construct", "activity", "spell"] as const)(
  "%s tests current kind-specific edits without saving",
  async (kind) => {
    installReply();
    await show({ ...DRAFT, kind });
    await page
      .getByRole("textbox", { name: "Name", exact: true })
      .fill("Unsaved name");
    await page
      .getByRole("textbox", { name: "Prompt", exact: true })
      .fill("Unsaved prompt");
    if (kind === "spell") {
      await page
        .getByRole("textbox", { name: "When to use", exact: true })
        .fill("Unsaved selection");
    }
    if (kind === "activity") {
      await page
        .getByRole("textbox", { name: "Opening request", exact: true })
        .fill("Unsaved opening");
    }
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
