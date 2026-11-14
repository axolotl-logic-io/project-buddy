// The editor on the page of her own construct, activity or spell, in the
// browser: Reset prompt to default changes the prompt only in the editor,
// until Save, and Undo reset takes it back; Save refuses a name of only
// spaces beside the name, keeping what she typed; and her unsaved changes
// are still there when she comes back to the page, until she saves or
// discards them. The pages' Server Actions are mocked; the server tests
// cover what Save stores.

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import ConstructPage from "@/app/(workspace)/constructs/[constructId]/page.tsx";
import { saveConstructAction } from "@/app/(workspace)/constructs/actions.ts";
import {
  getOwnConstruct,
  type OwnConstruct,
} from "@/constructs/construct-store.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { VELLUM_CLONE } from "../app/phone-pages-fixtures.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import { LAPTOP_VIEWPORT, setViewport } from "../viewports-test-kit.ts";

vi.mock("next/navigation", () => import("./router-test-kit.ts"));

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
vi.mock("@/constructs/construct-store.ts", () => ({
  getOwnConstruct: vi.fn<typeof getOwnConstruct>(),
}));
vi.mock("@/app/(workspace)/constructs/actions.ts", () => ({
  retireConstructAction: vi.fn(),
  editBuiltInConstructAction: vi.fn(),
  saveConstructAction: vi.fn(),
}));

// Her clone of Lumen, with a prompt of her own.
const LUMEN_CLONE: OwnConstruct = {
  ...VELLUM_CLONE,
  name: "Lumen (clone)",
  definition: {
    prompt: "# Voice\nPity the fool, {{name}}.\n\n## Habits\n- Ask first.",
  },
  clonedFrom: "lumen",
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(async () => {
  await setViewport(LAPTOP_VIEWPORT);
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// The form data the action receives once she saves. The action redirects;
// here it only resolves the form it was given.
function saved(action: typeof saveConstructAction): Promise<FormData> {
  const submitted = Promise.withResolvers<FormData>();
  vi.mocked(action).mockImplementation((formData: FormData) => {
    submitted.resolve(formData);
    return new Promise<never>(() => undefined);
  });
  return submitted.promise;
}

// Opens her construct's page, as the store gives the construct.
async function openConstruct(
  construct: OwnConstruct,
): Promise<{ leave: () => Promise<void> }> {
  signInAs(SIGNED_IN_USER);
  vi.mocked(getOwnConstruct).mockResolvedValue(construct);
  const screen = await render(
    inWorkspace(
      await ConstructPage({
        params: Promise.resolve({ constructId: construct.id }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  return { leave: (): Promise<void> => screen.unmount() };
}

function field(label: string): ReturnType<typeof page.getByLabelText> {
  return page.getByLabelText(label, { exact: true });
}

function button(name: string): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name, exact: true });
}

test("use_case_edit_construct", async () => {
  await openConstruct(LUMEN_CLONE);
  await field(PROMPT_COPY.nameLabel).fill("My lantern");
  await field("Visual description").fill("A brass lantern with blue light.");
  const submitted = saved(saveConstructAction);
  await button(PROMPT_COPY.save).click();
  const form = await submitted;
  expect(form.get("name")).toBe("My lantern");
  expect(form.get("visualDescription")).toBe(
    "A brass lantern with blue light.",
  );
  expect(form.has("prompt")).toBe(false);
  await expect.element(button(PROMPT_COPY.resetPrompt)).not.toBeInTheDocument();
});

test("invalid names keep the visual draft and focus the name", async () => {
  await openConstruct(LUMEN_CLONE);
  await field("Visual description").fill("A blue lantern");
  await field(PROMPT_COPY.nameLabel).fill("   ");
  await button(PROMPT_COPY.save).click();
  await expect.element(field(PROMPT_COPY.nameLabel)).toHaveFocus();
  await expect
    .element(field("Visual description"))
    .toHaveValue("A blue lantern");
  expect(saveConstructAction).not.toHaveBeenCalled();
});

test("name and visual drafts survive navigation and can be discarded", async () => {
  const opened = await openConstruct(LUMEN_CLONE);
  await field(PROMPT_COPY.nameLabel).fill("A new name");
  await field("Visual description").fill("A lantern in a blue cloak");
  await opened.leave();
  await openConstruct(LUMEN_CLONE);
  await expect.element(field(PROMPT_COPY.nameLabel)).toHaveValue("A new name");
  await expect
    .element(field("Visual description"))
    .toHaveValue("A lantern in a blue cloak");
  await button(PROMPT_COPY.discard).click();
  await expect
    .element(field(PROMPT_COPY.nameLabel))
    .toHaveValue(LUMEN_CLONE.name);
  await expect.element(field("Visual description")).toHaveValue("");
});

test("existing artwork requires a visual description and keeps invalid edits", async () => {
  await openConstruct({
    ...LUMEN_CLONE,
    definition: {
      ...LUMEN_CLONE.definition,
      visual: { version: 1, description: "A lantern" },
    },
  });
  await field("Visual description").fill(" ");
  await button(PROMPT_COPY.save).click();
  await expect.element(field("Visual description")).toHaveFocus();
  expect(saveConstructAction).not.toHaveBeenCalled();
});

test("saved artwork metadata does not replace a visual description draft", async () => {
  const opened = await openConstruct(LUMEN_CLONE);
  await field("Visual description").fill("A lantern with orbiting maps");
  await opened.leave();
  await openConstruct({
    ...LUMEN_CLONE,
    updatedAt: new Date("2026-11-05T12:00:00Z"),
  });
  await expect
    .element(field("Visual description"))
    .toHaveValue("A lantern with orbiting maps");
});

vi.mock("@/retirement/retirement-store.ts", () => ({
  getRetiredDefinition: vi.fn().mockResolvedValue(undefined),
}));
