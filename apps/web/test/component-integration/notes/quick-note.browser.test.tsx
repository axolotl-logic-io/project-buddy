// The site panel's Quick Note dialog and a quest's Quick Notes tab, in
// Chromium and WebKit. The Server Actions and the conversation's send are
// mocked; the server test (quick-notes.server.test.ts) checks what they
// store, edit and delete.
import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { QuestNotes } from "@/components/quest-notes.tsx";
import { AccountLinks } from "@/components/site-header.tsx";
import { SitePanel } from "@/components/site-panel.tsx";
import {
  NOTE_ID,
  NOTE_MAX_LENGTH,
  type NoteQuest,
  type NoteResult,
} from "@/notes/note.ts";
import { listNoteQuestsAction, saveNoteAction } from "@/notes/note-actions.ts";
import { QUEST_SHARING_COPY } from "@/ui/copy/quest-members.ts";
import { FOX_QUEST } from "../app/(workspace)/page-fixtures.ts";
import {
  chatSendMock,
  inConversation,
  sentTexts,
} from "../components/chat/chat-send-test-kit.tsx";
import {
  openPanel,
  panelButton,
  sitePanel,
} from "../components/site-panel-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

const OTHER_QUEST: NoteQuest = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Kiln",
  sharing: { kind: "personal" },
};
const JOINED_QUEST: NoteQuest = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Kiln",
  sharing: { kind: "joined", owner: "Rowan" },
};

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: (): string => route.pathname,
  useRouter: (): { refresh: () => void } => ({ refresh: vi.fn() }),
}));

async function openQuickNote(): Promise<void> {
  await render(<SitePanel links={<AccountLinks />} />);
  await panelButton().click();
  await page.getByRole("button", { name: "Quick Note", exact: true }).click();
}

beforeEach(() => {
  route.pathname = "/";
  vi.mocked(listNoteQuestsAction).mockResolvedValue([
    OTHER_QUEST,
    { id: FOX_QUEST.id, name: FOX_QUEST.name, sharing: FOX_QUEST.sharing },
  ]);
});

describe("use_case_quick_note", () => {
  test("the site panel's Quick Note saves a note to the open quest and keeps it chosen", async () => {
    route.pathname = `/quests/${FOX_QUEST.id}`;
    vi.mocked(saveNoteAction).mockResolvedValue({ kind: "saved" });
    await openQuickNote();

    const dialog = page.getByRole("dialog", { name: "Quick Note" });
    await expect.element(dialog).toBeVisible();
    await expect.element(sitePanel()).not.toBeInTheDocument();
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
    await expect.element(panelButton()).toHaveFocus();
  });

  test("in the site panel docked beside the page, Quick Note leaves the panel open and returns focus to itself", async () => {
    await setViewport(LAPTOP_VIEWPORT);
    try {
      await render(<SitePanel links={<AccountLinks />} />);
      await openPanel();
      const item = sitePanel().getByRole("button", {
        name: "Quick Note",
        exact: true,
      });
      await item.click();

      const dialog = page.getByRole("dialog", { name: "Quick Note" });
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

  test("a quest shared with others is marked with its owner, beside a personal one of the same name", async () => {
    vi.mocked(listNoteQuestsAction).mockResolvedValue([
      OTHER_QUEST,
      JOINED_QUEST,
    ]);
    await openQuickNote();

    const quest = page
      .getByRole("dialog", { name: "Quick Note" })
      .getByRole("combobox", { name: "Quick Note for" });
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
    const send = chatSendMock().mockResolvedValue({
      sent: true,
      note: "Deleted the Quick Note “Buy more clay”.",
    });
    await render(inConversation(send, <QuestNotes notes={notes} />));

    const list = page.getByRole("list", { name: "Quick Notes" });
    await expect
      .element(list.getByRole("listitem").first().getByText("Buy more clay"))
      .toBeVisible();
    await page
      .getByRole("button", {
        name: 'Actions for the Quick Note "Buy more clay"',
      })
      .click();
    await page
      .getByRole("menuitem", { name: 'Delete the Quick Note "Buy more clay"' })
      .click();
    expect(sentTexts(send)).toEqual(["/drop-note 1"]);
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("Deleted the Quick Note “Buy more clay”.");
    await expect
      .element(page.getByText("Buy more clay"))
      .not.toBeInTheDocument();
    await expect.element(page.getByText("Try a slower wheel")).toBeVisible();
  });

  test("a note has a multiline editor, saves line breaks and cancels changes", async () => {
    const send = chatSendMock().mockResolvedValue({ sent: true });
    await render(
      inConversation(
        send,
        <QuestNotes
          notes={[
            {
              id: NOTE_ID.parse("33333333-3333-4333-8333-333333333333"),
              text: "Buy more clay",
              savedAt: new Date("2026-11-14T12:00:00Z"),
            },
          ]}
        />,
      ),
    );
    const edit = page.getByRole("button", { name: "Edit Quick Note" });
    await edit.click();
    const field = page.getByRole("textbox", {
      name: "Quick Note",
      exact: true,
    });
    expect(field.element().tagName).toBe("TEXTAREA");
    await field.fill("Clay");
    await userEvent.keyboard("{End}");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("Glaze");
    await expect.element(field).toHaveValue("Clay\nGlaze");
    expect(send).not.toHaveBeenCalled();
    await page
      .getByRole("button", { name: "Save Quick Note", exact: true })
      .click();
    expect(sentTexts(send)).toEqual(["/edit-note 1 Clay\nGlaze"]);
    await expect
      .element(page.getByText("Clay\nGlaze", { exact: true }))
      .toBeVisible();
    await edit.click();
    await field.fill("Discard this");
    await page
      .getByRole("button", { name: "Cancel editing Quick Note" })
      .click();
    await expect.element(edit).toHaveTextContent("Clay Glaze");
    await expect.element(edit).toHaveFocus();
    expect(send).toHaveBeenCalledTimes(1);
  });

  test("invalid and refused edits keep the draft", async () => {
    const send = chatSendMock().mockResolvedValue({
      sent: false,
      problem: "Wait for the reply.",
    });
    await render(
      inConversation(
        send,
        <QuestNotes
          notes={[
            {
              id: NOTE_ID.parse("33333333-3333-4333-8333-333333333333"),
              text: "Buy more clay",
              savedAt: new Date("2026-11-14T12:00:00Z"),
            },
          ]}
        />,
      ),
    );
    await page.getByRole("button", { name: "Edit Quick Note" }).click();
    const field = page.getByRole("textbox", {
      name: "Quick Note",
      exact: true,
    });
    const save = page.getByRole("button", {
      name: "Save Quick Note",
      exact: true,
    });
    await field.fill("   ");
    await save.click();
    await expect.element(field).toHaveAttribute("aria-invalid", "true");
    await field.fill("a".repeat(NOTE_MAX_LENGTH + 1));
    await save.click();
    await expect.element(field).toHaveAttribute("aria-invalid", "true");
    expect(send).not.toHaveBeenCalled();
    await field.fill("Clay\nGlaze");
    await save.click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Wait for the reply.");
    await expect.element(field).toHaveValue("Clay\nGlaze");
  });

  test("a refused Quick Note deletion keeps the note and says why", async () => {
    const problem = "Wait for the reply to your last message, then try again.";
    const send = chatSendMock().mockResolvedValue({ sent: false, problem });
    await render(
      inConversation(
        send,
        <QuestNotes
          notes={[
            {
              id: NOTE_ID.parse("33333333-3333-4333-8333-333333333333"),
              text: "Buy more clay",
              savedAt: new Date("2026-11-14T12:00:00Z"),
            },
          ]}
        />,
      ),
    );

    await page
      .getByRole("button", {
        name: 'Actions for the Quick Note "Buy more clay"',
      })
      .click();
    await page
      .getByRole("menuitem", { name: 'Delete the Quick Note "Buy more clay"' })
      .click();

    await expect.element(page.getByRole("alert")).toHaveTextContent(problem);
    await expect.element(page.getByText("Buy more clay")).toBeVisible();
  });
});
