// The Spellbook's pages in the browser: the list offers New spell among her
// own spells, after the built-in ones in keyboard order; Delete asks before
// it deletes, and on a listed spell's page says its listing stays up; and
// her spell's page names each field's limit and keeps typing within it.
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import SpellbookPage from "@/app/(workspace)/spellbook/(list)/page.tsx";
import SpellPage from "@/app/(workspace)/spellbook/[spellId]/page.tsx";
import {
  deleteSpellAction,
  newSpellAction,
} from "@/app/(workspace)/spellbook/actions.ts";
import {
  listListedSources,
  readSaleState,
} from "@/marketplace/listing-store.ts";
import { listSpells } from "@/spells/index.ts";
import { SPELL_NAME_MAX, SPELL_TEXT_MAX } from "@/spells/spell.ts";
import { getOwnSpell, listOwnSpells } from "@/spells/spell-store.ts";
import { DELETE_PROMPT_COPY, PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { SPELL_DEFINITION_COPY, SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { listingIdFixture } from "../../../../support/id-fixtures.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import { tabForward } from "../../../components/keyboard-test-kit.ts";
import { ASK_ONE_QUESTION_CLONE } from "../../phone-pages-fixtures.ts";
import { inWorkspace } from "../../workspace-test-kit.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/spells/spell-store.ts", () => ({
  getOwnSpell: vi.fn<typeof getOwnSpell>(),
  listOwnSpells: vi.fn<typeof listOwnSpells>(),
}));
// Her spell's page offers it for sale; selling is the Marketplace's, which
// marketplace-pages.browser.test.tsx covers.
vi.mock("@/marketplace/listing-store.ts", () => ({
  listListedSources: vi.fn<typeof listListedSources>(),
  readSaleState: vi.fn<typeof readSaleState>(),
}));
vi.mock("@/app/(workspace)/marketplace/actions.ts", () => ({
  sellListingAction: vi.fn(),
}));
// The pages expose these actions; only New spell and Delete are submitted.
vi.mock("@/app/(workspace)/spellbook/actions.ts", () => ({
  cloneSpellAction: vi.fn(),
  deleteSpellAction: vi.fn(),
  editBuiltInSpellAction: vi.fn(),
  newSpellAction: vi.fn(),
  resetSpellPromptAction: vi.fn(),
  saveSpellAction: vi.fn(),
}));

// Her spells, under their heading.
function ownRegion(): ReturnType<typeof page.getByRole> {
  return page.getByRole("region", { name: SPELLBOOK_COPY.ownHeading });
}

// Resolves once the action is submitted. It redirects; here it only says
// it was submitted.
function submissionOf(
  action: typeof newSpellAction | typeof deleteSpellAction,
): Promise<void> {
  const submitted = Promise.withResolvers<void>();
  vi.mocked(action).mockImplementation(() => {
    submitted.resolve();
    return new Promise<never>(() => undefined);
  });
  return submitted.promise;
}

test("her spells offer New spell, with or without spells of her own", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listListedSources).mockResolvedValue(new Map());
  vi.mocked(listOwnSpells).mockResolvedValue([ASK_ONE_QUESTION_CLONE]);
  const screen = await render(inWorkspace(await SpellbookPage()));

  await expect
    .element(ownRegion().getByRole("button", { name: SPELLBOOK_COPY.newSpell }))
    .toBeEnabled();

  vi.mocked(listListedSources).mockResolvedValue(new Map());
  vi.mocked(listOwnSpells).mockResolvedValue([]);
  await screen.rerender(inWorkspace(await SpellbookPage()));
  await expect
    .element(ownRegion().getByText(SPELLBOOK_COPY.noOwn))
    .toBeVisible();
  await expect
    .element(ownRegion().getByRole("button", { name: SPELLBOOK_COPY.newSpell }))
    .toBeEnabled();
});

test("New spell is the next control after the built-in spells, and Enter writes one", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listListedSources).mockResolvedValue(new Map());
  vi.mocked(listOwnSpells).mockResolvedValue([]);
  const submitted = submissionOf(newSpellAction);
  await render(inWorkspace(await SpellbookPage()));
  const lastBuiltIn = listSpells().at(-1)?.name ?? "";

  page
    .getByRole("button", { name: SPELLBOOK_COPY.customizeLabel(lastBuiltIn) })
    .element()
    .focus();
  await tabForward();
  await expect
    .element(page.getByRole("button", { name: SPELLBOOK_COPY.newSpell }))
    .toHaveFocus();
  await userEvent.keyboard("{Enter}");

  await submitted;
  expect(newSpellAction).toHaveBeenCalledOnce();
});

test("Delete asks first: Keep it deletes nothing, and confirming deletes the spell", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listListedSources).mockResolvedValue(new Map());
  vi.mocked(listOwnSpells).mockResolvedValue([ASK_ONE_QUESTION_CLONE]);
  const submitted = submissionOf(deleteSpellAction);
  await render(inWorkspace(await SpellbookPage()));
  const deleteButton = page.getByRole("button", {
    name: DELETE_PROMPT_COPY.deleteLabel(ASK_ONE_QUESTION_CLONE.name),
  });

  await deleteButton.click();
  const dialog = page.getByRole("alertdialog", {
    name: DELETE_PROMPT_COPY.title("spell"),
  });
  await expect
    .element(dialog.getByRole("button", { name: DELETE_PROMPT_COPY.cancel }))
    .toHaveFocus();
  await userEvent.keyboard("{Enter}");
  await expect.element(dialog).not.toBeInTheDocument();
  expect(deleteSpellAction).not.toHaveBeenCalled();

  await deleteButton.click();
  await dialog
    .getByRole("button", { name: DELETE_PROMPT_COPY.confirm("spell") })
    .click();

  await submitted;
  expect(deleteSpellAction).toHaveBeenCalledOnce();
});

test("Delete on a listed spell's page says its listing stays up, and links to it", async () => {
  signInAs(SIGNED_IN_USER);
  const listing = listingIdFixture("9d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a");
  vi.mocked(getOwnSpell).mockResolvedValue(ASK_ONE_QUESTION_CLONE);
  vi.mocked(readSaleState).mockResolvedValue({ kind: "listed", listing });
  await render(
    inWorkspace(
      await SpellPage({
        params: Promise.resolve({ spellId: ASK_ONE_QUESTION_CLONE.id }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );

  await page
    .getByRole("button", {
      name: DELETE_PROMPT_COPY.deleteLabel(ASK_ONE_QUESTION_CLONE.name),
    })
    .click();
  const dialog = page.getByRole("alertdialog", {
    name: DELETE_PROMPT_COPY.title("spell"),
  });
  await expect
    .element(dialog)
    .toHaveAccessibleDescription(
      DELETE_PROMPT_COPY.description(
        "spell",
        ASK_ONE_QUESTION_CLONE.name,
        "listed",
      ),
    );
  await expect
    .element(dialog.getByRole("link", { name: DELETE_PROMPT_COPY.unlistLink }))
    .toHaveAttribute("href", `/marketplace/${listing}`);
});

test("her spell's page names each limit, and its fields keep within them", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(getOwnSpell).mockResolvedValue(ASK_ONE_QUESTION_CLONE);
  vi.mocked(readSaleState).mockResolvedValue({ kind: "listable" });
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
