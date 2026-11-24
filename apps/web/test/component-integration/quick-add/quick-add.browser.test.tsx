// The site panel's Quick Add dialog, in Chromium and WebKit. The Server
// Actions are mocked; the server test (lists/quick-add.server.test.ts)
// checks what they store.
import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { AccountLinks, SiteHeader } from "@/components/site-header.tsx";
import { SitePanel } from "@/components/site-panel.tsx";

import {
  listQuickAddQuests,
  type QuickAddQuest,
  saveQuickAdd,
} from "@/lists/quick-add-actions.ts";
import { QUEST_SHARING_COPY } from "@/ui/copy/quest-members.ts";
import { QUICK_ADD_COPY } from "@/ui/copy/quick-add.ts";
import { FOX_QUEST } from "../app/(workspace)/page-fixtures.ts";
import {
  openPanel,
  panelButton,
  sitePanel,
} from "../components/site-panel-test-kit.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

const LISTS = [
  { id: "6b778253-0b8a-4c2f-9072-3768bccb3e56", name: "Plans" },
  { id: "ddd24b82-23a2-4b82-80c5-886b70093227", name: "Sketches" },
];

const OTHER_QUEST: QuickAddQuest = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Kiln",
  lists: LISTS,
  sharing: { kind: "private" },
};
const JOINED_QUEST: QuickAddQuest = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Kiln",
  lists: LISTS,
  sharing: { kind: "joined", owner: "Rowan" },
};

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: (): string => route.pathname,
  useRouter: (): { refresh: () => void } => ({ refresh: vi.fn() }),
  useSearchParams: (): URLSearchParams => new URLSearchParams(),
}));

async function openQuickAdd(): Promise<void> {
  await render(<SiteHeader panel={<SitePanel links={<AccountLinks />} />} />);
  await panelButton().click();
  await page
    .getByRole("button", { name: QUICK_ADD_COPY.panelItem, exact: true })
    .click();
}

beforeEach(() => {
  applyTheme("parchment");
  route.pathname = "/";
  vi.mocked(listQuickAddQuests).mockResolvedValue([
    OTHER_QUEST,
    {
      id: FOX_QUEST.id,
      name: FOX_QUEST.name,
      sharing: FOX_QUEST.sharing,
      lists: LISTS,
    },
  ]);
});

describe("use_case_quick_add", () => {
  test("the site panel's Quick Add adds to the open quest and keeps it chosen", async () => {
    route.pathname = `/quests/${FOX_QUEST.id}`;
    vi.mocked(saveQuickAdd).mockResolvedValue({ kind: "saved" });
    await openQuickAdd();

    const dialog = page.getByRole("dialog", { name: QUICK_ADD_COPY.heading });
    await expect.element(dialog).toBeVisible();
    await expect.element(sitePanel()).not.toBeInTheDocument();
    const quest = dialog.getByRole("combobox", {
      name: QUICK_ADD_COPY.questLabel,
    });
    await expect.element(quest).toHaveValue(FOX_QUEST.id);

    const text = dialog.getByRole("textbox", {
      name: QUICK_ADD_COPY.textLabel,
    });
    await dialog.getByRole("button", { name: QUICK_ADD_COPY.save }).click();
    await expect
      .element(text)
      .toHaveAccessibleDescription(
        expect.stringContaining(QUICK_ADD_COPY.problem("empty")),
      );
    expect(saveQuickAdd).not.toHaveBeenCalled();

    const list = dialog.getByRole("combobox", {
      name: QUICK_ADD_COPY.listLabel,
    });
    await list.selectOptions("Sketches");
    await text.fill("Glaze the blue bowl");
    await dialog.getByRole("button", { name: QUICK_ADD_COPY.save }).click();
    expect(saveQuickAdd).toHaveBeenCalledWith({
      questId: FOX_QUEST.id,
      listId: "ddd24b82-23a2-4b82-80c5-886b70093227",
      text: "Glaze the blue bowl",
    });
    await expect
      .element(dialog.getByRole("status"))
      .toHaveTextContent(
        QUICK_ADD_COPY.savedToList(FOX_QUEST.name, "Sketches"),
      );
    await expect.element(text).toHaveValue("");
    await expect.element(quest).toHaveValue(FOX_QUEST.id);

    await userEvent.keyboard("{Escape}");
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(panelButton()).toHaveFocus();
  });

  test("in the site panel docked beside the page, Quick Add leaves the panel open and returns focus to itself", async () => {
    await setViewport(LAPTOP_VIEWPORT);
    try {
      await render(
        <SiteHeader panel={<SitePanel links={<AccountLinks />} />} />,
      );
      await openPanel();
      const item = sitePanel().getByRole("button", {
        name: QUICK_ADD_COPY.panelItem,
        exact: true,
      });
      await item.click();

      const dialog = page.getByRole("dialog", {
        name: QUICK_ADD_COPY.heading,
      });
      await expect.element(dialog).toBeVisible();
      await userEvent.keyboard("{Escape}");
      await expect.element(dialog).not.toBeInTheDocument();
      await expect.element(sitePanel()).toBeVisible();
      await expect.element(item).toHaveFocus();
    } finally {
      await setViewport(PHONE_VIEWPORT);
    }
  });

  test("away from a quest the newest Active quest is chosen, and a refusal keeps the text", async () => {
    vi.mocked(saveQuickAdd).mockResolvedValue({
      kind: "problem",
      text: QUICK_ADD_COPY.listUnavailable,
    });
    await setViewport(PHONE_VIEWPORT);
    await openQuickAdd();

    const dialog = page.getByRole("dialog", { name: QUICK_ADD_COPY.heading });
    await expect
      .element(
        dialog.getByRole("combobox", { name: QUICK_ADD_COPY.questLabel }),
      )
      .toHaveValue(OTHER_QUEST.id);
    const text = dialog.getByRole("textbox", {
      name: QUICK_ADD_COPY.textLabel,
    });
    await text.fill("Fire on Friday");
    await dialog.getByRole("button", { name: QUICK_ADD_COPY.save }).click();
    await expect
      .element(dialog.getByRole("alert"))
      .toHaveTextContent(QUICK_ADD_COPY.listUnavailable);
    await expect.element(text).toHaveValue("Fire on Friday");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      PHONE_VIEWPORT.width,
    );
  });

  test("a quest shared with others is marked with its owner, beside a private one of the same name", async () => {
    vi.mocked(listQuickAddQuests).mockResolvedValue([
      OTHER_QUEST,
      JOINED_QUEST,
    ]);
    await openQuickAdd();

    const quest = page
      .getByRole("dialog", { name: QUICK_ADD_COPY.heading })
      .getByRole("combobox", { name: QUICK_ADD_COPY.questLabel });
    await expect.element(quest).toBeVisible();
    const options = [...quest.element().querySelectorAll("option")].map(
      (option) => option.textContent,
    );
    expect(options).toEqual([
      "Kiln",
      QUEST_SHARING_COPY.option("Kiln", JOINED_QUEST.sharing),
    ]);
    expect(options[1]).toContain("Rowan");
  });

  test("with no Active quest the dialog points to Quests", async () => {
    vi.mocked(listQuickAddQuests).mockResolvedValue([]);
    await openQuickAdd();

    const dialog = page.getByRole("dialog", { name: QUICK_ADD_COPY.heading });
    await expect
      .element(dialog.getByRole("link", { name: QUICK_ADD_COPY.noQuestsLink }))
      .toHaveAttribute("href", "/quests");
    await expect
      .element(dialog.getByRole("textbox", { name: QUICK_ADD_COPY.textLabel }))
      .not.toBeInTheDocument();
  });
});
