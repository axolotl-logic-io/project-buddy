import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  EditableList,
  EditableListRow,
  EditableListScope,
} from "@/components/ui/editable-list.tsx";
import type { EditorOptions } from "@/components/ui/editable-list-contract.ts";

const EDITOR: EditorOptions = {
  label: "Text",
  save: "Save",
  cancel: "Cancel",
  placeholder: "Text",
  maxLength: 120,
  validate: (text: string): { text: string } => ({ text }),
};

test("a second click-away save waits for the first and leaves focus outside", async () => {
  const firstSave = Promise.withResolvers<boolean>();
  const waitingForSecond = Promise.withResolvers<string>();
  const saveFirst = vi
    .fn<(text: string) => Promise<boolean>>()
    .mockReturnValue(firstSave.promise);
  const saveSecond = vi.fn((text: string): Promise<boolean> => {
    waitingForSecond.resolve(text);
    return Promise.resolve(true);
  });
  await render(
    <EditableListScope>
      <EditableList label="Ideas">
        <EditableListRow
          id={crypto.randomUUID()}
          text="Ink"
          editor={EDITOR}
          editLabel="Edit ink"
          actionsLabel="Ink actions"
          disabled={false}
          onSave={saveFirst}
        >
          {null}
        </EditableListRow>
        <EditableListRow
          id={crypto.randomUUID()}
          text="Clay"
          editor={EDITOR}
          editLabel="Edit clay"
          actionsLabel="Clay actions"
          disabled={false}
          onSave={saveSecond}
        >
          {null}
        </EditableListRow>
      </EditableList>
      <input aria-label="Outside the list" />
    </EditableListScope>,
  );
  await page.getByRole("button", { name: "Edit ink" }).click();
  await page.getByRole("textbox", { name: "Text" }).fill("Try ink");
  await page.getByRole("button", { name: "Edit clay" }).click();
  await page
    .getByRole("listitem")
    .last()
    .getByRole("textbox", { name: "Text" })
    .fill("Try clay");
  const outside = page.getByRole("textbox", { name: "Outside the list" });
  await outside.click();

  expect(saveFirst).toHaveBeenCalledExactlyOnceWith("Try ink");
  expect(saveSecond).not.toHaveBeenCalled();
  firstSave.resolve(true);

  expect(await waitingForSecond.promise).toBe("Try clay");
  await expect
    .element(page.getByRole("textbox", { name: "Text" }))
    .not.toBeInTheDocument();
  await expect.element(outside).toHaveFocus();
});
