import { beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import SpellPage from "@/app/(workspace)/spellbook/[spellId]/page.tsx";
import {
  castSpellAction,
  newSpellAction,
  saveSpellAction,
} from "@/app/(workspace)/spellbook/actions.ts";
import { SpellLists } from "@/app/(workspace)/spellbook/spell-lists.tsx";
import { SpellPicker } from "@/components/spell-picker.tsx";
import { OWN_PROMPT_ID } from "@/ids.ts";
import {
  getOwnSpell,
  listOwnSpells,
  type OwnSpell,
} from "@/spells/own-spell-store.ts";
import {
  SPELL_DEFINITION,
  SPELL_REPLY_MAX,
} from "@/spells/spell-definition.ts";
import { EDITABLE_LIST_COPY } from "@/ui/copy/editable-list.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { TEXT_LIST_COPY } from "@/ui/copy/text-list.ts";
import { chatIdFixture } from "../../../../support/id-fixtures.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import { inWorkspace } from "../../workspace-test-kit.tsx";

vi.mock(
  "next/navigation",
  () => import("../../../components/router-test-kit.ts"),
);
vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/spells/own-spell-store.ts", () => ({
  findSpell: vi.fn().mockResolvedValue(undefined),
  getOwnSpell: vi.fn(),
  listOwnSpells: vi.fn(),
}));
vi.mock("@/app/(workspace)/spellbook/actions.ts", () => ({
  castSpellAction: vi.fn(),
  newSpellAction: vi.fn(),
  cloneSpellAction: vi.fn(),
  saveSpellAction: vi.fn(),
  retireSpellAction: vi.fn(),
}));

const OWN: OwnSpell = {
  id: OWN_PROMPT_ID.parse("92115283-1234-4123-8123-123456789abc"),
  name: "Sketch ideas",
  definition: SPELL_DEFINITION.parse({
    destination: "brainstorm",
  }),
  clonedFrom: "brainstorm",
  createdAt: new Date("2026-11-01T00:00:00Z"),
  updatedAt: new Date("2026-11-01T00:00:00Z"),
};
beforeEach(() => {
  signInAs(SIGNED_IN_USER);
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(getOwnSpell).mockResolvedValue(OWN);
  vi.mocked(listOwnSpells).mockResolvedValue([OWN]);
});
async function ownPage(): Promise<void> {
  await render(
    inWorkspace(
      await SpellPage({
        params: Promise.resolve({ spellId: OWN.id }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
}

test("the spell collection offers built-ins, own spells and creation", async () => {
  await render(inWorkspace(await SpellLists()));
  await expect
    .element(page.getByRole("link", { name: "Plan", exact: true }))
    .toBeVisible();
  await expect
    .element(page.getByRole("link", { name: OWN.name, exact: true }))
    .toBeVisible();
  await page
    .getByRole("button", { name: SPELLBOOK_COPY.newSpell, exact: true })
    .click();
  expect(newSpellAction).toHaveBeenCalledOnce();
});

test("a built-in spell can be copied and remains read-only", async () => {
  await render(
    inWorkspace(
      await SpellPage({
        params: Promise.resolve({ spellId: "plan" }),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  await expect
    .element(
      page.getByRole("button", { name: SPELLBOOK_COPY.customize, exact: true }),
    )
    .toBeVisible();
  await expect.element(page.getByRole("textbox")).not.toBeInTheDocument();
});

test("name, replies and destination survive navigation and submit together", async () => {
  await ownPage();
  const nameInput = page
    .getByRole("textbox", { name: PROMPT_COPY.nameLabel, exact: true })
    .element();
  const destinationInput = page
    .getByRole("combobox", { name: SPELLBOOK_COPY.destination, exact: true })
    .element();
  const heading = page
    .getByRole("heading", { name: "Spell Messages", exact: true })
    .element();
  expect(nameInput.getBoundingClientRect().bottom).toBeLessThanOrEqual(
    destinationInput.getBoundingClientRect().top,
  );
  expect(destinationInput.getBoundingClientRect().bottom).toBeLessThanOrEqual(
    heading.getBoundingClientRect().top,
  );
  await expect
    .element(
      page.getByRole("button", {
        name: SPELLBOOK_COPY.destination,
        exact: true,
      }),
    )
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole("button", { name: "Instructions", exact: true }))
    .not.toBeInTheDocument();

  await page
    .getByRole("textbox", { name: PROMPT_COPY.nameLabel, exact: true })
    .fill("Sketch steps");
  await page
    .getByRole("combobox", { name: SPELLBOOK_COPY.destination, exact: true })
    .selectOptions("plan");
  await page
    .getByRole("button", {
      name: SPELLBOOK_COPY.responses.savedReply,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: TEXT_LIST_COPY.edit, exact: true })
    .click();
  await page
    .getByRole("textbox", { name: TEXT_LIST_COPY.entry, exact: true })
    .fill("Noted in {{bucket}}: {{message}}");
  await page
    .getByRole("button", { name: TEXT_LIST_COPY.save, exact: true })
    .click();
  await page
    .getByRole("button", { name: TEXT_LIST_COPY.add, exact: true })
    .click();
  await page
    .getByRole("textbox", { name: TEXT_LIST_COPY.entry, exact: true })
    .fill("Another reply: {{message}}");
  await page
    .getByRole("button", { name: TEXT_LIST_COPY.save, exact: true })
    .click();
  await cleanup();
  await ownPage();
  await expect
    .element(
      page.getByRole("textbox", { name: PROMPT_COPY.nameLabel, exact: true }),
    )
    .toHaveValue("Sketch steps");
  await expect
    .element(
      page.getByRole("combobox", {
        name: SPELLBOOK_COPY.destination,
        exact: true,
      }),
    )
    .toHaveValue("plan");
  await page
    .getByRole("button", { name: PROMPT_COPY.save, exact: true })
    .click();
  expect(saveSpellAction).toHaveBeenCalledOnce();
  const [form] = vi.mocked(saveSpellAction).mock.calls[0] ?? [];
  expect(form?.get("name")).toBe("Sketch steps");
  expect(form?.has("prompt")).toBe(false);
  expect(form?.get("destination")).toBe("plan");
  expect(form?.get("savedReply")).toBe(
    JSON.stringify([
      "Another reply: {{message}}",
      "Noted in {{bucket}}: {{message}}",
    ]),
  );
});

vi.mock("@/retirement/retirement-store.ts", () => ({
  getRetiredDefinition: vi.fn().mockResolvedValue(undefined),
}));

test("a quest picker casts the chosen own spell", async () => {
  const chatId = chatIdFixture();
  await render(<SpellPicker chatId={chatId} spells={[OWN]} />);
  await page
    .getByRole("combobox", { name: SPELLBOOK_COPY.choose })
    .selectOptions(OWN.id);
  expect(castSpellAction).not.toHaveBeenCalled();
  await page
    .getByRole("button", { name: SPELLBOOK_COPY.cast, exact: true })
    .click();
  expect(castSpellAction).toHaveBeenCalledOnce();
  const [form] = vi.mocked(castSpellAction).mock.calls[0] ?? [];
  expect(form?.get("chatId")).toBe(chatId);
  expect(form?.get("spellId")).toBe(OWN.id);
});

test("saving the spell includes a reply still being edited", async () => {
  await ownPage();
  await page
    .getByRole("button", {
      name: SPELLBOOK_COPY.responses.savedReply,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: TEXT_LIST_COPY.edit, exact: true })
    .click();
  await page
    .getByRole("textbox", { name: TEXT_LIST_COPY.entry, exact: true })
    .fill("A reply still being edited.");
  await page
    .getByRole("button", { name: PROMPT_COPY.save, exact: true })
    .click();
  expect(saveSpellAction).toHaveBeenCalledOnce();
  const [form] = vi.mocked(saveSpellAction).mock.calls[0] ?? [];
  expect(form?.get("savedReply")).toBe(
    JSON.stringify(["A reply still being edited."]),
  );
});

test("an invalid reply stops the spell save and keeps its draft", async () => {
  await ownPage();
  await page
    .getByRole("button", {
      name: SPELLBOOK_COPY.responses.savedReply,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: TEXT_LIST_COPY.edit, exact: true })
    .click();
  const input = page.getByRole("textbox", {
    name: TEXT_LIST_COPY.entry,
    exact: true,
  });
  await input.fill("   ");
  await page
    .getByRole("button", { name: PROMPT_COPY.save, exact: true })
    .click();
  expect(saveSpellAction).not.toHaveBeenCalled();
  await expect.element(input).toHaveValue("   ");
  await expect
    .element(page.getByText(TEXT_LIST_COPY.invalid(SPELL_REPLY_MAX)))
    .toBeVisible();
});

test("reply alternatives can be reordered and removed while keeping one choice", async () => {
  vi.mocked(getOwnSpell).mockResolvedValue({
    ...OWN,
    definition: { ...OWN.definition, savedReply: ["First", "Second"] },
  });
  await ownPage();
  const label = SPELLBOOK_COPY.responses.savedReply;
  await page.getByRole("button", { name: label, exact: true }).click();
  const handle = page.getByRole("button", {
    name: EDITABLE_LIST_COPY.reorder("Second"),
  });
  handle.element().focus();
  await userEvent.keyboard("{ArrowUp}");
  await expect
    .element(
      page.getByRole("list", { name: label }).getByRole("listitem").first(),
    )
    .toHaveTextContent("Second");
  await page
    .getByRole("button", { name: TEXT_LIST_COPY.actions("First") })
    .click();
  await page.getByRole("menuitem", { name: TEXT_LIST_COPY.remove }).click();
  await expect
    .element(page.getByRole("list", { name: label }).getByRole("listitem"))
    .toHaveTextContent("Second");
  await page
    .getByRole("button", { name: TEXT_LIST_COPY.actions("Second") })
    .click();
  await expect
    .element(page.getByRole("menuitem", { name: TEXT_LIST_COPY.remove }))
    .toBeDisabled();
  await userEvent.keyboard("{Escape}");
  expect(saveSpellAction).not.toHaveBeenCalled();
  await page
    .getByRole("button", { name: PROMPT_COPY.save, exact: true })
    .click();
  const [form] = vi.mocked(saveSpellAction).mock.calls[0] ?? [];
  expect(form?.get("savedReply")).toBe(JSON.stringify(["Second"]));
});
