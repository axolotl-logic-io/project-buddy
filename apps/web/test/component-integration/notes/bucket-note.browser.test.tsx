import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChatBusyContext } from "@/components/chat/chat-send.ts";
import { QuestNotes } from "@/components/quest-notes.tsx";
import { NOTE_ID, NOTE_MAX_LENGTH, type NoteResult } from "@/notes/note.ts";
import { saveNoteAction } from "@/notes/note-actions.ts";
import { QUEST_NOTES_COPY, QUICK_NOTE_COPY } from "@/ui/copy/notes.ts";
import { FOX_QUEST } from "../app/(workspace)/page-fixtures.ts";
import {
  chatSendMock,
  inConversation,
} from "../components/chat/chat-send-test-kit.tsx";
import { applyTheme } from "../themes/theme-test-kit.ts";
import { NARROWEST_VIEWPORT, setViewport } from "../viewports-test-kit.ts";

const TOUCH_TARGET = 44;

const NEW_NOTE = {
  id: NOTE_ID.parse("33333333-3333-4333-8333-333333333333"),
  text: "Clay\nGlaze",
  savedAt: new Date("2026-11-16T12:00:00Z"),
};
const OLD_NOTE = {
  id: NOTE_ID.parse("44444444-4444-4444-8444-444444444444"),
  text: "Buy more clay",
  savedAt: new Date("2026-11-15T12:00:00Z"),
};

beforeEach(() => {
  applyTheme("parchment");
  vi.mocked(saveNoteAction).mockResolvedValue({
    kind: "saved",
    notes: [NEW_NOTE],
  });
});

describe("bucket Quick Note creation", () => {
  test.each([{ notes: [] }, { notes: [OLD_NOTE] }])(
    "saves in this quest from an empty or populated bucket and stays ready",
    async ({ notes }) => {
      const send = chatSendMock();
      vi.mocked(saveNoteAction).mockResolvedValue({
        kind: "saved",
        notes: [NEW_NOTE, ...notes],
      });
      await render(
        inConversation(send, <QuestNotes quest={FOX_QUEST} notes={notes} />),
      );
      const form = page.getByRole("form", { name: "Add Quick Note" });
      const field = form.getByRole("textbox", { name: "Quick Note" });
      await expect.element(page.getByRole("combobox")).not.toBeInTheDocument();
      await field.fill("  Clay");
      await userEvent.keyboard("{End}");
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("Glaze  ");
      expect(saveNoteAction).not.toHaveBeenCalled();
      await form.getByRole("button", { name: "Save Quick Note" }).click();
      expect(saveNoteAction).toHaveBeenCalledWith({
        questId: FOX_QUEST.id,
        text: NEW_NOTE.text,
      });
      expect(send).not.toHaveBeenCalled();
      await expect.element(field).toHaveValue("");
      await expect.element(field).toHaveFocus();
      await expect
        .element(form.getByRole("status"))
        .toHaveTextContent("Quick Note saved.");
      const rows = page
        .getByRole("list", { name: "Quick Notes" })
        .getByRole("listitem");
      await expect
        .element(rows.first().getByRole("button", { name: "Edit Quick Note" }))
        .toHaveTextContent("Clay Glaze");
      const date = rows.first().element().querySelector("time");
      if (date === null) {
        throw new Error("The saved note has no date");
      }
      expect(date.getAttribute("dateTime")).toBe(
        NEW_NOTE.savedAt.toISOString(),
      );
      await field.fill("Discard");
      await form.getByRole("button", { name: "Clear", exact: true }).click();
      await expect.element(field).toHaveValue("");
      await expect.element(field).toHaveFocus();
      expect(saveNoteAction).toHaveBeenCalledTimes(1);
    },
  );

  test("invalid, refused and failed saves keep the draft with an explanation", async () => {
    await render(
      inConversation(
        chatSendMock(),
        <QuestNotes quest={FOX_QUEST} notes={[]} />,
      ),
    );
    const field = page.getByRole("textbox", { name: "Quick Note" });
    const save = page.getByRole("button", { name: "Save Quick Note" });
    await field.fill("  ");
    await save.click();
    await expect.element(field).toHaveAttribute("aria-invalid", "true");
    await expect.element(field).toHaveValue("  ");
    await field.fill("a".repeat(NOTE_MAX_LENGTH + 1));
    await save.click();
    await expect.element(field).toHaveAttribute("aria-invalid", "true");
    await expect.element(field).toHaveValue("a".repeat(NOTE_MAX_LENGTH + 1));
    await expect.element(field).toHaveFocus();
    expect(saveNoteAction).not.toHaveBeenCalled();
    vi.mocked(saveNoteAction).mockResolvedValue({
      kind: "problem",
      text: QUICK_NOTE_COPY.notFound,
    });
    await field.fill("Kept\ndraft");
    await save.click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(QUEST_NOTES_COPY.unavailable);
    await expect.element(field).toHaveValue("Kept\ndraft");
    vi.mocked(saveNoteAction).mockRejectedValue(new Error("Offline"));
    await save.click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(QUICK_NOTE_COPY.failed);
    await expect.element(field).toHaveValue("Kept\ndraft");
  });

  test("a pending save locks the draft and controls and cannot duplicate a note", async () => {
    const pending = Promise.withResolvers<NoteResult>();
    vi.mocked(saveNoteAction).mockReturnValue(pending.promise);
    await render(
      inConversation(
        chatSendMock(),
        <QuestNotes quest={FOX_QUEST} notes={[OLD_NOTE]} />,
      ),
    );
    const field = page.getByRole("textbox", { name: "Quick Note" });
    await field.fill(NEW_NOTE.text);
    await page.getByRole("button", { name: "Save Quick Note" }).click();
    await expect.element(field).toHaveAttribute("readonly");
    await expect
      .element(page.getByRole("button", { name: "Clear", exact: true }))
      .toBeDisabled();
    await expect
      .element(page.getByRole("button", { name: "Saving the Quick Note…" }))
      .toBeDisabled();
    await expect
      .element(page.getByRole("button", { name: "Edit Quick Note" }))
      .toBeDisabled();
    const form = page.getByRole("form", { name: "Add Quick Note" }).element();
    form.requestSubmit();
    expect(saveNoteAction).toHaveBeenCalledTimes(1);
    pending.resolve({ kind: "saved", notes: [NEW_NOTE, OLD_NOTE] });
    await expect.element(field).toHaveValue("");
    await expect.element(field).toHaveFocus();
  });

  test.each(["completed", "abandoned"] as const)(
    "%s quests keep saved notes but take no new ones",
    async (status) => {
      await render(
        inConversation(
          chatSendMock(),
          <QuestNotes quest={{ ...FOX_QUEST, status }} notes={[OLD_NOTE]} />,
        ),
      );
      await expect
        .element(page.getByRole("button", { name: "Save Quick Note" }))
        .toBeDisabled();
      await expect
        .element(page.getByText(QUEST_NOTES_COPY.inactive))
        .toBeVisible();
      await expect
        .element(page.getByRole("button", { name: "Edit Quick Note" }))
        .toBeEnabled();
      expect(saveNoteAction).not.toHaveBeenCalled();
    },
  );

  test("outside a conversation no new Quick Note can be submitted", async () => {
    await render(<QuestNotes quest={FOX_QUEST} notes={[]} />);
    await expect
      .element(page.getByRole("button", { name: "Save Quick Note" }))
      .toBeDisabled();
    await expect
      .element(page.getByText("Open the quest's conversation to do this."))
      .toBeVisible();
  });

  test("a reply pauses saving without losing a draft", async () => {
    const screen = await render(
      inConversation(
        chatSendMock(),
        <ChatBusyContext.Provider value={false}>
          <QuestNotes quest={FOX_QUEST} notes={[]} />
        </ChatBusyContext.Provider>,
      ),
    );
    const field = page.getByRole("textbox", { name: "Quick Note" });
    await field.fill("Keep me");
    await screen.rerender(
      inConversation(
        chatSendMock(),
        <ChatBusyContext.Provider value={true}>
          <QuestNotes quest={FOX_QUEST} notes={[]} />
        </ChatBusyContext.Provider>,
      ),
    );
    await expect
      .element(page.getByRole("button", { name: "Save Quick Note" }))
      .toBeDisabled();
    await expect.element(field).toHaveValue("Keep me");
    expect(saveNoteAction).not.toHaveBeenCalled();
  });

  test.each(["light", "dark", "soot-brass"])(
    "the composer fits a 320 px phone in %s",
    async (mode) => {
      applyTheme("parchment", mode);
      await setViewport(NARROWEST_VIEWPORT);
      await render(
        inConversation(
          chatSendMock(),
          <QuestNotes quest={FOX_QUEST} notes={[OLD_NOTE]} />,
        ),
      );
      const form = page.getByRole("form", { name: "Add Quick Note" });
      await expect.element(form).toBeVisible();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        NARROWEST_VIEWPORT.width,
      );
      for (const button of form.element().querySelectorAll("button")) {
        const rect = button.getBoundingClientRect();
        expect(rect.width).toBeGreaterThanOrEqual(TOUCH_TARGET);
        expect(rect.height).toBeGreaterThanOrEqual(TOUCH_TARGET);
      }
    },
  );
});
