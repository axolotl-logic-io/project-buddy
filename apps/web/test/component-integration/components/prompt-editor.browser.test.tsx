// The editor on the page of her own buddy, activity or spell, in the
// browser: Reset prompt to default changes the prompt only in the editor,
// until Save, and Undo reset takes it back; Save refuses a name of only
// spaces beside the name, keeping what she typed; and her unsaved changes
// are still there when she comes back to the page, until she saves or
// discards them. The pages' Server Actions are mocked; the server tests
// cover what Save stores.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  getOwnActivity,
  type OwnActivity,
} from "@/activities/activity-store.ts";
import { getActivity } from "@/activities/index.ts";
import ActivityPage from "@/app/(workspace)/activities/[activityId]/page.tsx";
import { saveActivityAction } from "@/app/(workspace)/activities/actions.ts";
import BuddyPage from "@/app/(workspace)/buddies/[buddyId]/page.tsx";
import { saveBuddyAction } from "@/app/(workspace)/buddies/actions.ts";
import SpellPage from "@/app/(workspace)/spellbook/[spellId]/page.tsx";
import { saveSpellAction } from "@/app/(workspace)/spellbook/actions.ts";
import { getOwnBuddy, type OwnBuddy } from "@/buddies/buddy-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import { readSaleState } from "@/marketplace/listing-store.ts";
import { getSpell } from "@/spells/index.ts";
import { getOwnSpell } from "@/spells/spell-store.ts";
import { ACTIVITY_DEFINITION_COPY } from "@/ui/copy/activities.ts";
import { BUDDY_DEFINITION_COPY } from "@/ui/copy/buddies.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { SPELL_DEFINITION_COPY } from "@/ui/copy/spells.ts";
import {
  ASK_ONE_QUESTION_CLONE,
  BRAINSTORMING_CLONE,
  VELLUM_CLONE,
} from "../app/phone-pages-fixtures.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";

vi.mock("@/workshop/options.ts", () => ({
  workshopOptions: async () => ({
    buddies: [{ id: "vellum", name: "Vellum" }],
    activities: [{ id: "open-chat", name: "Open chat" }],
  }),
}));

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
vi.mock("@/buddies/buddy-store.ts", () => ({
  getOwnBuddy: vi.fn<typeof getOwnBuddy>(),
}));
vi.mock("@/activities/activity-store.ts", () => ({
  getOwnActivity: vi.fn<typeof getOwnActivity>(),
}));
vi.mock("@/spells/spell-store.ts", () => ({
  getOwnSpell: vi.fn<typeof getOwnSpell>(),
}));
// Each page offers its prompt for sale; selling is the Marketplace's.
vi.mock("@/marketplace/listing-store.ts", () => ({
  readSaleState: vi.fn<typeof readSaleState>(),
}));
vi.mock("@/app/(workspace)/marketplace/actions.ts", () => ({
  sellListingAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/buddies/actions.ts", () => ({
  deleteBuddyAction: vi.fn(),
  editBuiltInBuddyAction: vi.fn(),
  saveBuddyAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/activities/actions.ts", () => ({
  deleteActivityAction: vi.fn(),
  editBuiltInActivityAction: vi.fn(),
  saveActivityAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/spellbook/actions.ts", () => ({
  deleteSpellAction: vi.fn(),
  editBuiltInSpellAction: vi.fn(),
  saveSpellAction: vi.fn(),
}));

// Her clone of Lumen, with a prompt of her own.
const LUMEN_CLONE: OwnBuddy = {
  ...VELLUM_CLONE,
  name: "Lumen (clone)",
  definition: {
    prompt: "# Voice\nPity the fool, {{name}}.\n\n## Habits\n- Ask first.",
  },
  clonedFrom: "lumen",
};

const BUDDY_PROMPT: string = BUDDY_DEFINITION_COPY.prompt.label;

afterEach(() => {
  vi.clearAllMocks();
});

// The form data the action receives once she saves. The action redirects;
// here it only resolves the form it was given.
function saved(
  action:
    | typeof saveBuddyAction
    | typeof saveActivityAction
    | typeof saveSpellAction,
): Promise<FormData> {
  const submitted = Promise.withResolvers<FormData>();
  vi.mocked(action).mockImplementation((formData: FormData) => {
    submitted.resolve(formData);
    return new Promise<never>(() => undefined);
  });
  return submitted.promise;
}

// Opens her buddy's page, as the store gives the buddy.
async function openBuddy(
  buddy: OwnBuddy,
): Promise<{ leave: () => Promise<void> }> {
  signInAs(SIGNED_IN_USER);
  vi.mocked(getOwnBuddy).mockResolvedValue(buddy);
  vi.mocked(readSaleState).mockResolvedValue({ kind: "listable" });
  const screen = await render(
    inWorkspace(
      await BuddyPage({
        params: Promise.resolve({ buddyId: buddy.id }),
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

describe("use_case_reset_buddy_part", () => {
  test("Reset puts the built-in buddy's prompt in the editor, unsaved, Undo reset takes it back, and Save saves it", async () => {
    await openBuddy(LUMEN_CLONE);

    await button(PROMPT_COPY.resetPrompt).click();
    await expect
      .element(field(BUDDY_PROMPT))
      .toHaveValue(getBuddy("lumen").definition.prompt);
    await expect
      .element(
        page.getByRole("status").filter({ hasText: PROMPT_COPY.resetDone }),
      )
      .toBeVisible();
    expect(saveBuddyAction).not.toHaveBeenCalled();

    await button(PROMPT_COPY.undoReset).click();
    await expect
      .element(field(BUDDY_PROMPT))
      .toHaveValue(LUMEN_CLONE.definition.prompt);
    await expect.element(field(BUDDY_PROMPT)).toHaveFocus();
    await expect.element(button(PROMPT_COPY.undoReset)).not.toBeInTheDocument();

    const submitted = saved(saveBuddyAction);
    await button(PROMPT_COPY.resetPrompt).click();
    await button(PROMPT_COPY.save).click();
    const form = await submitted;
    expect(form.get("buddyId")).toBe(LUMEN_CLONE.id);
    expect(form.get("name")).toBe(LUMEN_CLONE.name);
    expect(form.get("prompt")).toBe(getBuddy("lumen").definition.prompt);
  });

  test("the prompt of a buddy cloned from one of her own, or written from scratch, resets to Vellum's", async () => {
    await openBuddy({
      ...LUMEN_CLONE,
      clonedFrom: VELLUM_CLONE.id,
    });

    await button(PROMPT_COPY.resetPrompt).click();

    await expect
      .element(field(BUDDY_PROMPT))
      .toHaveValue(getBuddy("vellum").definition.prompt);
  });
});

describe("use_case_edit_buddy", () => {
  test("Save sends the name and the prompt as she wrote them, {{name}} included", async () => {
    await openBuddy(LUMEN_CLONE);
    const submitted = saved(saveBuddyAction);

    await field(PROMPT_COPY.nameLabel).fill("Lumen, edited");
    await field(BUDDY_PROMPT).fill("Changed {{name}}");
    await button(PROMPT_COPY.save).click();

    const form = await submitted;
    expect(form.get("name")).toBe("Lumen, edited");
    expect(form.get("prompt")).toBe("Changed {{name}}");
  });

  test("a name of only spaces is refused beside the name, which gets focus, and her text stays", async () => {
    await openBuddy(LUMEN_CLONE);
    const name = field(PROMPT_COPY.nameLabel);

    await field(BUDDY_PROMPT).fill("My new prompt");
    await name.fill("   ");
    await button(PROMPT_COPY.save).click();

    await expect.element(name).toHaveFocus();
    await expect.element(name).toHaveAttribute("aria-invalid", "true");
    await expect
      .element(name)
      .toHaveAccessibleDescription(PROMPT_COPY.needsName("buddy"));
    await expect.element(name).toHaveValue("   ");
    await expect.element(field(BUDDY_PROMPT)).toHaveValue("My new prompt");
    expect(saveBuddyAction).not.toHaveBeenCalled();

    const submitted = saved(saveBuddyAction);
    await name.fill("Named again");
    await expect.element(name).not.toHaveAttribute("aria-invalid");
    await userEvent.keyboard("{Enter}");
    expect((await submitted).get("name")).toBe("Named again");
  });

  test("her unsaved changes are back when she returns to the page, until she discards them", async () => {
    const firstVisit = await openBuddy(LUMEN_CLONE);
    await field(PROMPT_COPY.nameLabel).fill("Half-renamed");
    await field(BUDDY_PROMPT).fill("Half-written prompt");
    await firstVisit.leave();

    const secondVisit = await openBuddy(LUMEN_CLONE);
    await expect
      .element(field(PROMPT_COPY.nameLabel))
      .toHaveValue("Half-renamed");
    await expect
      .element(field(BUDDY_PROMPT))
      .toHaveValue("Half-written prompt");
    await expect
      .element(
        page.getByRole("status").filter({ hasText: PROMPT_COPY.restored }),
      )
      .toBeVisible();
    expect(saveBuddyAction).not.toHaveBeenCalled();

    await button(PROMPT_COPY.discard).click();
    await expect
      .element(field(PROMPT_COPY.nameLabel))
      .toHaveValue(LUMEN_CLONE.name);
    await expect
      .element(field(BUDDY_PROMPT))
      .toHaveValue(LUMEN_CLONE.definition.prompt);
    await expect.element(button(PROMPT_COPY.discard)).not.toBeInTheDocument();
    await secondVisit.leave();

    await openBuddy(LUMEN_CLONE);
    await expect
      .element(field(BUDDY_PROMPT))
      .toHaveValue(LUMEN_CLONE.definition.prompt);
  });

  test("changes made before a later save of the buddy are dropped, not shown over it", async () => {
    const firstVisit = await openBuddy(LUMEN_CLONE);
    await field(BUDDY_PROMPT).fill("Typed before the save");
    await firstVisit.leave();

    await openBuddy({
      ...LUMEN_CLONE,
      definition: { prompt: "Saved since" },
      updatedAt: new Date("2026-10-14T09:00:00Z"),
    });

    await expect.element(field(BUDDY_PROMPT)).toHaveValue("Saved since");
    await expect.element(button(PROMPT_COPY.discard)).not.toBeInTheDocument();
  });
});

test("Reset on her activity's page changes the prompt only, keeping her opening request", async () => {
  signInAs(SIGNED_IN_USER);
  const activity: OwnActivity = {
    ...BRAINSTORMING_CLONE,
    definition: { prompt: "My prompt.", openingRequest: "My opening." },
  };
  vi.mocked(getOwnActivity).mockResolvedValue(activity);
  vi.mocked(readSaleState).mockResolvedValue({ kind: "listable" });
  await render(
    inWorkspace(
      await ActivityPage({
        params: Promise.resolve({ activityId: activity.id }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  const submitted = saved(saveActivityAction);

  await button(PROMPT_COPY.resetPrompt).click();
  await button(PROMPT_COPY.save).click();

  const form = await submitted;
  expect(form.get("prompt")).toBe(
    getActivity("brainstorming").definition.prompt,
  );
  expect(form.get("openingRequest")).toBe("My opening.");
  await expect
    .element(field(ACTIVITY_DEFINITION_COPY.openingRequest.label))
    .toHaveValue("My opening.");
});

test("Reset on her spell's page changes the prompt only, keeping its when-to-use description", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(getOwnSpell).mockResolvedValue({
    ...ASK_ONE_QUESTION_CLONE,
    definition: { whenToUse: "When she plans a render.", prompt: "Mine." },
  });
  vi.mocked(readSaleState).mockResolvedValue({ kind: "listable" });
  await render(
    inWorkspace(
      await SpellPage({
        params: Promise.resolve({ spellId: ASK_ONE_QUESTION_CLONE.id }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  const submitted = saved(saveSpellAction);

  await button(PROMPT_COPY.resetPrompt).click();
  await button(PROMPT_COPY.save).click();

  const form = await submitted;
  expect(form.get("prompt")).toBe(
    getSpell("ask-one-question").definition.prompt,
  );
  expect(form.get("whenToUse")).toBe("When she plans a render.");
  await expect
    .element(field(SPELL_DEFINITION_COPY.whenToUse.label))
    .toHaveValue("When she plans a render.");
});

test("Reset twice and leaving preserve the original unsaved text for Undo", async () => {
  const visit = await openBuddy(LUMEN_CLONE);
  await field(BUDDY_PROMPT).fill("Before either reset");
  await button(PROMPT_COPY.resetPrompt).click();
  await button(PROMPT_COPY.resetPrompt).click();
  await visit.leave();
  await openBuddy(LUMEN_CLONE);
  await expect
    .element(field(BUDDY_PROMPT))
    .toHaveValue(getBuddy("lumen").definition.prompt);
  await button(PROMPT_COPY.undoReset).click();
  await expect.element(field(BUDDY_PROMPT)).toHaveValue("Before either reset");
});
