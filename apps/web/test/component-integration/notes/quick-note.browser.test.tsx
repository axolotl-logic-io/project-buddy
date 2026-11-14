// The site menu's Quick Note dialog and a quest's Quick Notes tab, in
// Chromium and WebKit. The Server Actions are mocked; the server test
// (quick-notes.server.test.ts) checks what they store.
import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { QuestNotes } from "@/components/quest-notes.tsx";
import { AccountLinks } from "@/components/site-header.tsx";
import { SiteMenu } from "@/components/site-menu.tsx";
import { NOTE_ID, type NoteResult } from "@/notes/note.ts";
import { listNoteQuestsAction, saveNoteAction } from "@/notes/note-actions.ts";
import { FOX_QUEST } from "../app/(workspace)/page-fixtures.ts";
import { PHONE_VIEWPORT, setViewport } from "../viewports-test-kit.ts";

const OTHER_QUEST = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Kiln",
};

// site-header.tsx reads the session for SignedInLinks, server code.
vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: (): string => route.pathname,
  useRouter: (): { refresh: () => void } => ({ refresh: vi.fn() }),
}));

async function openQuickNote(): Promise<void> {
  await render(<SiteMenu links={<AccountLinks />} />);
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Quick Note", exact: true }).click();
}

beforeEach(() => {
  route.pathname = "/";
  vi.mocked(listNoteQuestsAction).mockResolvedValue([
    OTHER_QUEST,
    { id: FOX_QUEST.id, name: FOX_QUEST.name },
  ]);
});

describe("use_case_quick_note", () => {
  test("the menu's Quick Note saves a note to the open quest and keeps it chosen", async () => {
    route.pathname = `/quests/${FOX_QUEST.id}`;
    vi.mocked(saveNoteAction).mockResolvedValue({ kind: "saved" });
    await openQuickNote();

    const dialog = page.getByRole("dialog", { name: "Quick Note" });
    await expect.element(dialog).toBeVisible();
    await expect
      .element(page.getByRole("dialog", { name: "Menu" }))
      .not.toBeInTheDocument();
    const quest = dialog.getByRole("combobox", { name: "Quick Note for" });
    await expect.element(quest).toHaveValue(FOX_QUEST.id);

    const text = dialog.getByRole("textbox", { name: "Quick Note" });
    await dialog.getByRole("button", { name: "Save Quick Note" }).click();
    await expect
      .element(text)
      .toHaveAccessibleDescription(
        expect.stringContaining("An empty Quick Note can't be saved."),
      );
    expect(saveNoteAction).not.toHaveBeenCalled();

    await text.fill("Glaze the blue bowl");
    await dialog.getByRole("button", { name: "Save Quick Note" }).click();
    expect(saveNoteAction).toHaveBeenCalledWith({
      questId: FOX_QUEST.id,
      text: "Glaze the blue bowl",
    });
    await expect
      .element(dialog.getByRole("status"))
      .toHaveTextContent(`Saved to ${FOX_QUEST.name}'s Quick Notes.`);
    await expect.element(text).toHaveValue("");
    await expect.element(quest).toHaveValue(FOX_QUEST.id);

    await userEvent.keyboard("{Escape}");
    await expect.element(dialog).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Menu" }))
      .toHaveFocus();
  });

  test("away from a quest the newest Active quest is chosen, and a refusal keeps the text", async () => {
    vi.mocked(saveNoteAction).mockResolvedValue({
      kind: "problem",
      text: "That quest is no longer Active.",
    } satisfies NoteResult);
    await setViewport(PHONE_VIEWPORT);
    await openQuickNote();

    const dialog = page.getByRole("dialog", { name: "Quick Note" });
    await expect
      .element(dialog.getByRole("combobox", { name: "Quick Note for" }))
      .toHaveValue(OTHER_QUEST.id);
    const text = dialog.getByRole("textbox", { name: "Quick Note" });
    await text.fill("Fire on Friday");
    await dialog.getByRole("button", { name: "Save Quick Note" }).click();
    await expect
      .element(dialog.getByRole("alert"))
      .toHaveTextContent("That quest is no longer Active.");
    await expect.element(text).toHaveValue("Fire on Friday");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      PHONE_VIEWPORT.width,
    );
  });

  test("with no Active quest the dialog points to Quests", async () => {
    vi.mocked(listNoteQuestsAction).mockResolvedValue([]);
    await openQuickNote();

    const dialog = page.getByRole("dialog", { name: "Quick Note" });
    await expect
      .element(dialog.getByRole("link", { name: "Go to Quests" }))
      .toHaveAttribute("href", "/quests");
    await expect
      .element(dialog.getByRole("textbox", { name: "Quick Note" }))
      .not.toBeInTheDocument();
  });

  test("a quest's Quick Notes tab lists notes and deletes one", async () => {
    const newest = {
      id: NOTE_ID.parse("33333333-3333-4333-8333-333333333333"),
      text: "Buy more clay",
      savedAt: new Date("2026-11-14T12:00:00Z"),
    };
    const notes = [
      newest,
      {
        id: NOTE_ID.parse("44444444-4444-4444-8444-444444444444"),
        text: "Try a slower wheel",
        savedAt: new Date("2026-11-12T12:00:00Z"),
      },
    ];
    const action = vi.fn().mockResolvedValue({ kind: "deleted" });
    await render(
      <QuestNotes questId={FOX_QUEST.id} notes={notes} action={action} />,
    );

    const list = page.getByRole("list", { name: "Quick Notes" });
    await expect
      .element(list.getByRole("listitem").first().getByText("Buy more clay"))
      .toBeVisible();
    await page
      .getByRole("button", { name: 'Delete the Quick Note "Buy more clay"' })
      .click();
    expect(action).toHaveBeenCalledWith({
      questId: FOX_QUEST.id,
      id: newest.id,
    });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("Quick Note deleted.");
    await expect
      .element(page.getByText("Buy more clay"))
      .not.toBeInTheDocument();
    await expect.element(page.getByText("Try a slower wheel")).toBeVisible();
  });
});
