import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { TextAreaField } from "@/components/ui/field.tsx";
import { Workshop } from "@/components/workshop/workshop.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";
import {
  WORKSHOP_REQUEST,
  type WorkshopDraft,
  type WorkshopRequest,
} from "@/workshop/protocol.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";

const DRAFT: WorkshopDraft = {
  kind: "buddy",
  id: "hippy",
  name: "My buddy",
  prompt: "Offer one small experiment.",
  whenToUse: "",
  openingRequest: "",
};
const OPTIONS = {
  buddies: [{ id: "hippy", name: "Hippy" }],
  activities: [
    { id: "open-chat", name: "Open chat" },
    { id: "brainstorming", name: "Brainstorming" },
  ],
};
const requests: WorkshopRequest[] = [];

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
        <form>
          <TextAreaField
            label="Prompt"
            name="prompt"
            defaultValue={draft.prompt}
          />
        </form>
      </Workshop>,
    ),
  );
}
function message(): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: WORKSHOP_COPY.message });
}
afterEach(() => {
  vi.unstubAllGlobals();
});

test("use_case_workshop_draft", async () => {
  installReply();
  await show();
  await page
    .getByRole("textbox", { name: "Prompt", exact: true })
    .fill("Ask one short question.");
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(page.getByText("Try a tiny prototype.")).toBeVisible();
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
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent(userMessage("out-of-gold"));
  await expect
    .element(message())
    .toHaveValue(WORKSHOP_COPY.examples[0].message);
});

test("starting a new test cancels the request already in flight", async () => {
  let signal: AbortSignal | null | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init: RequestInit): Promise<Response> => {
      ({ signal } = init);
      return new Promise((_resolve, reject) => {
        signal?.addEventListener(
          "abort",
          () => {
            reject(new DOMException("Cancelled", "AbortError"));
          },
          { once: true },
        );
      });
    }),
  );
  await show();
  await page.getByRole("button", { name: WORKSHOP_COPY.send }).click();
  await expect.element(page.getByText(WORKSHOP_COPY.pending)).toBeVisible();
  await page.getByRole("button", { name: WORKSHOP_COPY.fresh }).click();
  expect(signal?.aborted).toBe(true);
  await expect
    .element(page.getByRole("button", { name: WORKSHOP_COPY.send }))
    .toBeEnabled();
  await expect.element(page.getByText(WORKSHOP_COPY.empty)).toBeVisible();
});
