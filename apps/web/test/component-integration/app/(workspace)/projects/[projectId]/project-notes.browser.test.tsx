// A project's notes on its page, in Chromium and WebKit. Each note shows
// its day and text with a Delete button named for the note.
// "use_case_delete_note": deleting one sends that note, then, with the note
// and its button gone, focus moves to the notes' heading and the status says
// it was deleted. What the delete saves is notes.server.test.ts's.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type {
  DeleteNoteState,
  deleteNoteAction,
} from "@/app/(workspace)/projects/[projectId]/(overview)/actions.ts";
import { ProjectNotes } from "@/app/(workspace)/projects/[projectId]/(overview)/project-notes.tsx";
import { NOTE_DAY, type Note } from "@/notes/note.ts";
import { PROJECT_NOTES_COPY } from "@/ui/copy/notes.ts";
import { FOX_PROJECT } from "../../page-fixtures.ts";

const actions = vi.hoisted(() => ({
  deleteNoteAction: vi.fn<typeof deleteNoteAction>(),
}));
vi.mock(
  "@/app/(workspace)/projects/[projectId]/(overview)/actions.ts",
  () => actions,
);

const CAGE: Note = { day: NOTE_DAY.parse("2026-11-02"), text: "try a cage" };
const EYES: Note = { day: NOTE_DAY.parse("2026-11-03"), text: "glass eyes" };

function deleteButton(note: Note): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", {
    name: PROJECT_NOTES_COPY.deleteLabel(note.text),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

test("lists each note with its day, under the Notes heading, and links to quick capture with the project", async () => {
  await render(
    <ProjectNotes notes={[EYES, CAGE]} projectId={FOX_PROJECT.id} />,
  );

  const list = page.getByRole("list", { name: PROJECT_NOTES_COPY.heading });
  await expect.element(list).toBeVisible();
  expect(
    list
      .getByRole("listitem")
      .elements()
      .map((item) => item.querySelector("time")?.getAttribute("datetime")),
  ).toEqual([EYES.day, CAGE.day]);
  await expect.element(list.getByText("Nov 03, 2026")).toBeVisible();
  await expect.element(deleteButton(CAGE)).toBeVisible();
  await expect
    .element(page.getByRole("link", { name: PROJECT_NOTES_COPY.addLink }))
    .toHaveAttribute("href", `/capture?projectId=${FOX_PROJECT.id}`);
});

test("with no notes, says there are none yet", async () => {
  await render(<ProjectNotes notes={[]} projectId={FOX_PROJECT.id} />);

  await expect.element(page.getByText(PROJECT_NOTES_COPY.none)).toBeVisible();
});

describe("use_case_delete_note", () => {
  test("deleting a note sends it, then moves focus to the heading and says it was deleted", async () => {
    const { promise, resolve } = Promise.withResolvers<DeleteNoteState>();
    actions.deleteNoteAction.mockReturnValue(promise);
    const screen = await render(
      <ProjectNotes notes={[EYES, CAGE]} projectId={FOX_PROJECT.id} />,
    );

    await deleteButton(CAGE).click();

    await expect.element(deleteButton(EYES)).toBeDisabled();
    const [, sent] = actions.deleteNoteAction.mock.lastCall ?? [];
    expect(Object.fromEntries(sent ?? [])).toEqual({
      projectId: FOX_PROJECT.id,
      day: CAGE.day,
      text: CAGE.text,
    });
    resolve({ kind: "deleted" });
    await screen.rerender(
      <ProjectNotes notes={[EYES]} projectId={FOX_PROJECT.id} />,
    );

    await expect
      .element(page.getByRole("heading", { name: PROJECT_NOTES_COPY.heading }))
      .toHaveFocus();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(PROJECT_NOTES_COPY.deleted);
    expect(deleteButton(CAGE).query()).toBeNull();
  });
});
