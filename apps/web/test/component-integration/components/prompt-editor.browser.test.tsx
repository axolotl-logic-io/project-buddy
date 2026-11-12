// The editor on the page of her own construct, activity or spell, in the
// browser: Reset prompt to default changes the prompt only in the editor,
// until Save, and Undo reset takes it back; Save refuses a name of only
// spaces beside the name, keeping what she typed; and her unsaved changes
// are still there when she comes back to the page, until she saves or
// discards them. The pages' Server Actions are mocked; the server tests
// cover what Save stores.

import type { JSX } from "react";
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
import ConstructPage from "@/app/(workspace)/constructs/[constructId]/page.tsx";
import { saveConstructAction } from "@/app/(workspace)/constructs/actions.ts";
import SpellPage from "@/app/(workspace)/spellbook/[spellId]/page.tsx";
import { saveSpellAction } from "@/app/(workspace)/spellbook/actions.ts";
import {
  getOwnConstruct,
  type OwnConstruct,
} from "@/constructs/construct-store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { getSpell } from "@/spells/index.ts";
import { getOwnSpell } from "@/spells/spell-store.ts";
import { ACTIVITY_DEFINITION_COPY } from "@/ui/copy/activities.ts";
import { CONSTRUCT_DEFINITION_COPY } from "@/ui/copy/constructs.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { SPELL_DEFINITION_COPY } from "@/ui/copy/spells.ts";
import {
  ASK_ONE_QUESTION_CLONE,
  BRAINSTORMING_CLONE,
  VELLUM_CLONE,
} from "../app/phone-pages-fixtures.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

vi.mock("next/navigation", () => import("./router-test-kit.ts"));

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
vi.mock("@/constructs/construct-store.ts", () => ({
  getOwnConstruct: vi.fn<typeof getOwnConstruct>(),
}));
vi.mock("@/activities/activity-store.ts", () => ({
  getOwnActivity: vi.fn<typeof getOwnActivity>(),
}));
vi.mock("@/spells/spell-store.ts", () => ({
  getOwnSpell: vi.fn<typeof getOwnSpell>(),
}));
vi.mock("@/app/(workspace)/constructs/actions.ts", () => ({
  retireConstructAction: vi.fn(),
  editBuiltInConstructAction: vi.fn(),
  saveConstructAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/activities/actions.ts", () => ({
  retireActivityAction: vi.fn(),
  editBuiltInActivityAction: vi.fn(),
  saveActivityAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/spellbook/actions.ts", () => ({
  retireSpellAction: vi.fn(),
  editBuiltInSpellAction: vi.fn(),
  saveSpellAction: vi.fn(),
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

const CONSTRUCT_PROMPT: string = CONSTRUCT_DEFINITION_COPY.prompt.label;

afterEach(async () => {
  await setViewport(LAPTOP_VIEWPORT);
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// The form data the action receives once she saves. The action redirects;
// here it only resolves the form it was given.
function saved(
  action:
    | typeof saveConstructAction
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

describe("use_case_reset_construct_part", () => {
  test("Reset puts the built-in construct's prompt in the editor, unsaved, Undo reset takes it back, and Save saves it", async () => {
    await openConstruct(LUMEN_CLONE);

    await button(PROMPT_COPY.resetPrompt).click();
    await expect
      .element(field(CONSTRUCT_PROMPT))
      .toHaveValue(getConstruct("lumen").definition.prompt);
    await expect
      .element(
        page.getByRole("status").filter({ hasText: PROMPT_COPY.resetDone }),
      )
      .toBeVisible();
    expect(saveConstructAction).not.toHaveBeenCalled();

    await button(PROMPT_COPY.undoReset).click();
    await expect
      .element(field(CONSTRUCT_PROMPT))
      .toHaveValue(LUMEN_CLONE.definition.prompt);
    await expect.element(field(CONSTRUCT_PROMPT)).toHaveFocus();
    await expect.element(button(PROMPT_COPY.undoReset)).not.toBeInTheDocument();

    const submitted = saved(saveConstructAction);
    await button(PROMPT_COPY.resetPrompt).click();
    await button(PROMPT_COPY.save).click();
    const form = await submitted;
    expect(form.get("constructId")).toBe(LUMEN_CLONE.id);
    expect(form.get("name")).toBe(LUMEN_CLONE.name);
    expect(form.get("prompt")).toBe(getConstruct("lumen").definition.prompt);
  });

  test("the prompt of a construct cloned from one of her own, or crafted, resets to Vellum's", async () => {
    await openConstruct({
      ...LUMEN_CLONE,
      clonedFrom: VELLUM_CLONE.id,
    });

    await button(PROMPT_COPY.resetPrompt).click();

    await expect
      .element(field(CONSTRUCT_PROMPT))
      .toHaveValue(getConstruct("vellum").definition.prompt);
  });
});

describe("use_case_edit_construct", () => {
  test("Save sends the name and the prompt as she wrote them, {{name}} included", async () => {
    await openConstruct(LUMEN_CLONE);
    const submitted = saved(saveConstructAction);

    await field(PROMPT_COPY.nameLabel).fill("Lumen, edited");
    await button(CONSTRUCT_PROMPT).click();
    await field(CONSTRUCT_PROMPT).fill("Changed {{name}}");
    await button(PROMPT_COPY.save).click();

    const form = await submitted;
    expect(form.get("name")).toBe("Lumen, edited");
    expect(form.get("prompt")).toBe("Changed {{name}}");
  });

  test("a name of only spaces is refused beside the name, which gets focus, and her text stays", async () => {
    await openConstruct(LUMEN_CLONE);
    const name = field(PROMPT_COPY.nameLabel);

    await button(CONSTRUCT_PROMPT).click();
    await field(CONSTRUCT_PROMPT).fill("My new prompt");
    await name.fill("   ");
    await button(PROMPT_COPY.save).click();

    await expect.element(name).toHaveFocus();
    await expect.element(name).toHaveAttribute("aria-invalid", "true");
    await expect
      .element(name)
      .toHaveAccessibleDescription(PROMPT_COPY.needsName("construct"));
    await expect.element(name).toHaveValue("   ");
    await expect.element(field(CONSTRUCT_PROMPT)).toHaveValue("My new prompt");
    expect(saveConstructAction).not.toHaveBeenCalled();

    const submitted = saved(saveConstructAction);
    await name.fill("Named again");
    await expect.element(name).not.toHaveAttribute("aria-invalid");
    await userEvent.keyboard("{Enter}");
    expect((await submitted).get("name")).toBe("Named again");
  });

  test("her unsaved changes are back when she returns to the page, until she discards them", async () => {
    const firstVisit = await openConstruct(LUMEN_CLONE);
    await field(PROMPT_COPY.nameLabel).fill("Half-renamed");
    await button(CONSTRUCT_PROMPT).click();
    await field(CONSTRUCT_PROMPT).fill("Half-written prompt");
    await firstVisit.leave();

    const secondVisit = await openConstruct(LUMEN_CLONE);
    await expect
      .element(field(PROMPT_COPY.nameLabel))
      .toHaveValue("Half-renamed");
    await expect
      .element(field(CONSTRUCT_PROMPT))
      .toHaveValue("Half-written prompt");
    await expect
      .element(
        page.getByRole("status").filter({ hasText: PROMPT_COPY.restored }),
      )
      .toBeVisible();
    expect(saveConstructAction).not.toHaveBeenCalled();

    await button(PROMPT_COPY.discard).click();
    await expect
      .element(field(PROMPT_COPY.nameLabel))
      .toHaveValue(LUMEN_CLONE.name);
    await expect
      .element(field(CONSTRUCT_PROMPT))
      .toHaveValue(LUMEN_CLONE.definition.prompt);
    await expect.element(button(PROMPT_COPY.discard)).not.toBeInTheDocument();
    await secondVisit.leave();

    await openConstruct(LUMEN_CLONE);
    await expect
      .element(field(CONSTRUCT_PROMPT))
      .toHaveValue(LUMEN_CLONE.definition.prompt);
  });

  test("changes made before a later save of the construct are dropped, not shown over it", async () => {
    const firstVisit = await openConstruct(LUMEN_CLONE);
    await button(CONSTRUCT_PROMPT).click();
    await field(CONSTRUCT_PROMPT).fill("Typed before the save");
    await firstVisit.leave();

    await openConstruct({
      ...LUMEN_CLONE,
      definition: { prompt: "Saved since" },
      updatedAt: new Date("2026-10-14T09:00:00Z"),
    });

    await expect.element(field(CONSTRUCT_PROMPT)).toHaveValue("Saved since");
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
  const visit = await openConstruct(LUMEN_CLONE);
  await button(CONSTRUCT_PROMPT).click();
  await field(CONSTRUCT_PROMPT).fill("Before either reset");
  await button(PROMPT_COPY.resetPrompt).click();
  await button(PROMPT_COPY.resetPrompt).click();
  await visit.leave();
  await openConstruct(LUMEN_CLONE);
  await expect
    .element(field(CONSTRUCT_PROMPT))
    .toHaveValue(getConstruct("lumen").definition.prompt);
  await button(PROMPT_COPY.undoReset).click();
  await expect
    .element(field(CONSTRUCT_PROMPT))
    .toHaveValue("Before either reset");
});

vi.mock("@/retirement/retirement-store.ts", () => ({
  getRetiredDefinition: vi.fn(),
  listRetiredDefinitions: vi.fn(),
}));

test("Visual description survives recovery, prompt reset and discard, and Save submits it separately", async () => {
  const original = "A brass guide with a parchment map.";
  const edited = "A brass guide with orbiting maps, {{name}} stays literal.";
  const construct = {
    ...LUMEN_CLONE,
    definition: {
      ...LUMEN_CLONE.definition,
      visual: { version: 1, description: original },
    },
  } satisfies OwnConstruct;
  const opened = await openConstruct(construct);
  await button("Visual description").click();
  await field("Visual description").fill(edited);
  await button(PROMPT_COPY.resetPrompt).click();
  await expect.element(field("Visual description")).toHaveValue(edited);
  await opened.leave();
  await openConstruct(construct);
  await expect.element(field("Visual description")).toHaveValue(edited);
  await button(PROMPT_COPY.discard).click();
  await expect.element(field("Visual description")).toHaveValue(original);
  await button("Visual description").click();
  await field("Visual description").fill(edited);
  const submission = saved(saveConstructAction);
  await button(PROMPT_COPY.save).click();
  expect((await submission).get("visualDescription")).toBe(edited);
});

test("clearing an existing Visual description shows field feedback and keeps edits", async () => {
  await openConstruct({
    ...LUMEN_CLONE,
    definition: {
      ...LUMEN_CLONE.definition,
      visual: { version: 1, description: "A warm light" },
    },
  });
  await button("Visual description").click();
  await field("Visual description").fill(" ");
  await button(PROMPT_COPY.save).click();
  await expect.element(field("Visual description")).toHaveFocus();
  await expect
    .element(
      page.getByText("Keep a Visual description for this construct’s images."),
    )
    .toBeVisible();
  expect(saveConstructAction).not.toHaveBeenCalled();
});

test("new saved artwork does not discard a browser draft on reload", async () => {
  const opened = await openConstruct(LUMEN_CLONE);
  await button("Visual description").click();
  await field("Visual description").fill("A new light in a blue cloak");
  await opened.leave();
  await openConstruct({
    ...LUMEN_CLONE,
    updatedAt: new Date("2026-11-05T12:00:00Z"),
  });
  await expect
    .element(field("Visual description"))
    .toHaveValue("A new light in a blue cloak");
});

test("saving an edited appearance offers Save without generation controls or requests", async () => {
  await setViewport(NARROWEST_VIEWPORT);
  const request = vi.fn<typeof fetch>(() =>
    Promise.reject(new Error("Unexpected request")),
  );
  vi.stubGlobal("fetch", request);
  await openConstruct(VELLUM_CLONE);
  await button("Visual description").click();
  await field("Visual description").fill("A silver fox with a blue cloak");
  await expect.element(button("Generate Images")).not.toBeInTheDocument();
  await expect
    .element(button("Save and generate images"))
    .not.toBeInTheDocument();
  const submission = saved(saveConstructAction);
  await button(PROMPT_COPY.save).click();
  const data = await submission;
  expect(data.get("visualDescription")).toBe("A silver fox with a blue cloak");
  expect(data.has("visualRequestId")).toBe(false);
  expect(data.has("generateImages")).toBe(false);
  expect(request).not.toHaveBeenCalled();
});

test.each(["activity", "spell"] as const)(
  "a saved %s shows visible announced confirmation and saved fields",
  async (kind) => {
    signInAs(SIGNED_IN_USER);
    vi.mocked(getOwnActivity).mockResolvedValue(BRAINSTORMING_CLONE);
    vi.mocked(getOwnSpell).mockResolvedValue(ASK_ONE_QUESTION_CLONE);
    let view: JSX.Element;
    if (kind === "activity") {
      view = await ActivityPage({
        params: Promise.resolve({ activityId: BRAINSTORMING_CLONE.id }),
        searchParams: Promise.resolve({ saved: "1" }),
      });
    } else {
      view = await SpellPage({
        params: Promise.resolve({ spellId: ASK_ONE_QUESTION_CLONE.id }),
        searchParams: Promise.resolve({ saved: "1" }),
      });
    }
    await render(inWorkspace(view));
    await expect
      .element(page.getByRole("status").filter({ hasText: PROMPT_COPY.saved }))
      .toBeVisible();
    await expect.element(field("Name")).not.toHaveValue("");
    await expect.element(button(PROMPT_COPY.discard)).not.toBeInTheDocument();
  },
);

vi.mock("@/app/(workspace)/quests/actions.ts", () => ({
  startQuestAction: vi.fn(),
}));
vi.mock("@/quests/quest-creation-choices.ts", () => ({
  questCreationChoices: vi.fn().mockResolvedValue({
    activities: [],
    userConstructs: [],
    preferredConstructId: "vellum",
  }),
}));
