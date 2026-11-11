// The Spellbook's pages in the browser: the list offers Create spell among her
// own spells, after the built-in ones in keyboard order; Delete asks before
// it deletes; and her spell's page names each field's limit, keeps typing
// within it, and names what its reset restores.
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import SpellPage from "@/app/(workspace)/spellbook/[spellId]/page.tsx";
import {
  newSpellAction,
  retireSpellAction,
} from "@/app/(workspace)/spellbook/actions.ts";
import { SpellLists } from "@/app/(workspace)/spellbook/spell-lists.tsx";
import { getSpell } from "@/spells/index.ts";
import { SPELL_NAME_MAX, SPELL_TEXT_MAX } from "@/spells/spell.ts";
import { getOwnSpell, listOwnSpells } from "@/spells/spell-store.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { SPELL_DEFINITION_COPY, SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import { ASK_ONE_QUESTION_CLONE } from "../../phone-pages-fixtures.ts";
import { inWorkspace } from "../../workspace-test-kit.tsx";

vi.mock(
  "next/navigation",
  () => import("../../../components/router-test-kit.ts"),
);

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/spells/spell-store.ts", () => ({
  getOwnSpell: vi.fn<typeof getOwnSpell>(),
  listOwnSpells: vi.fn<typeof listOwnSpells>(),
}));
// The pages expose these actions; only Craft spell and Delete are submitted.
vi.mock("@/app/(workspace)/spellbook/actions.ts", () => ({
  cloneSpellAction: vi.fn(),
  retireSpellAction: vi.fn(),
  editBuiltInSpellAction: vi.fn(),
  newSpellAction: vi.fn(),
  resetSpellPromptAction: vi.fn(),
  saveSpellAction: vi.fn(),
}));

// Her spells, under their heading.
function ownRegion(): ReturnType<typeof page.getByRole> {
  return page.getByRole("region", {
    name: SPELLBOOK_COPY.ownHeading,
    exact: true,
  });
}

// Resolves once the action is submitted. It redirects; here it only says
// it was submitted.
function submissionOf(
  action: typeof newSpellAction | typeof retireSpellAction,
): Promise<void> {
  const submitted = Promise.withResolvers<void>();
  vi.mocked(action).mockImplementation(() => {
    submitted.resolve();
    return new Promise<never>(() => undefined);
  });
  return submitted.promise;
}

test("her spells offer Create spell, with or without spells of her own", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listOwnSpells).mockResolvedValue([ASK_ONE_QUESTION_CLONE]);
  const screen = await render(inWorkspace(await SpellLists()));

  await expect
    .element(page.getByRole("button", { name: "Create spell" }))
    .toBeEnabled();

  vi.mocked(listOwnSpells).mockResolvedValue([]);
  await screen.rerender(inWorkspace(await SpellLists()));
  await expect
    .element(ownRegion().getByText(SPELLBOOK_COPY.noOwn))
    .toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Create spell" }))
    .toBeEnabled();
});

test("the header Create spell action supports keyboard submission", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listOwnSpells).mockResolvedValue([]);
  const submitted = submissionOf(newSpellAction);
  await render(inWorkspace(await SpellLists()));
  page
    .getByRole("button", { name: "Create spell", exact: true })
    .element()
    .focus();
  await expect
    .element(page.getByRole("button", { name: "Create spell" }))
    .toHaveFocus();
  await userEvent.keyboard("{Enter}");

  await submitted;
  expect(newSpellAction).toHaveBeenCalledOnce();
});

test("Retire submits the spell from its existing card", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listOwnSpells).mockResolvedValue([ASK_ONE_QUESTION_CLONE]);
  const submitted = submissionOf(retireSpellAction);
  await render(inWorkspace(await SpellLists()));
  await page
    .getByRole("button", {
      name: RETIREMENT_COPY.retireLabel(ASK_ONE_QUESTION_CLONE.name),
    })
    .click();
  await submitted;
  expect(retireSpellAction).toHaveBeenCalledOnce();
  expect(vi.mocked(retireSpellAction).mock.calls[0]?.[0].get("spellId")).toBe(
    ASK_ONE_QUESTION_CLONE.id,
  );
});

test("her spell's page names each limit, and its fields keep within them", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(getOwnSpell).mockResolvedValue(ASK_ONE_QUESTION_CLONE);
  await render(
    inWorkspace(
      await SpellPage({
        params: Promise.resolve({ spellId: ASK_ONE_QUESTION_CLONE.id }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );

  const fields = [
    { label: PROMPT_COPY.nameLabel, max: SPELL_NAME_MAX },
    {
      label: SPELL_DEFINITION_COPY.whenToUse.label,
      max: SPELL_TEXT_MAX.whenToUse,
    },
    {
      label: SPELL_DEFINITION_COPY.prompt.label,
      max: SPELL_TEXT_MAX.prompt,
    },
  ];
  await Promise.all(
    fields.map(async ({ label, max }) => {
      const field = page.getByLabelText(label, { exact: true });
      await expect
        .element(field)
        .toHaveAccessibleDescription(
          expect.stringContaining(PROMPT_COPY.limit(max)),
        );
      expect(field.element()).toHaveAttribute("maxlength", String(max));
    }),
  );
});

test.each([
  {
    made: "customized from a built-in spell",
    spell: ASK_ONE_QUESTION_CLONE,
    source: getSpell("ask-one-question").name,
  },
  {
    made: "crafted",
    spell: { ...ASK_ONE_QUESTION_CLONE, clonedFrom: undefined },
    source: undefined,
  },
])("her spell $made names what its reset restores", async ({ spell }) => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(getOwnSpell).mockResolvedValue(spell);
  await render(
    inWorkspace(
      await SpellPage({
        params: Promise.resolve({ spellId: spell.id }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );

  await expect
    .element(
      page.getByRole("button", {
        name: PROMPT_COPY.resetPrompt,
      }),
    )
    .toBeVisible();
});

vi.mock("@/retirement/retirement-store.ts", () => ({
  getRetiredDefinition: vi.fn(),
  listRetiredDefinitions: vi.fn(() => Promise.resolve([])),
}));
