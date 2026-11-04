// The project's memory on its page, in Chromium and WebKit: shown formatted
// with an Edit button, and edited in place. Edit swaps the formatted memory
// for an editor holding its text and moves focus into it; Save sends her text
// and, once saved, shows the memory formatted again with focus back on Edit;
// Cancel drops her changes. What a save keeps is memory-actions.server.test.ts's.
import type { JSX } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type {
  MemoryFormState,
  saveMemoryAction,
} from "@/app/(workspace)/projects/[projectId]/memory/actions.ts";
import { MemoryView } from "@/app/(workspace)/projects/[projectId]/memory/memory-view.tsx";
import { MEMORY_VERSION_NUMBER, type Memory } from "@/memory/memory.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { userIdFixture } from "../../../../../../support/id-fixtures.ts";
import { tabForward } from "../../../../../components/keyboard-test-kit.ts";
import { FOX_PROJECT } from "../../../page-fixtures.ts";

const actions = vi.hoisted(() => ({
  saveMemoryAction: vi.fn<typeof saveMemoryAction>(),
  restoreMemoryAction: vi.fn(),
}));
vi.mock(
  "@/app/(workspace)/projects/[projectId]/memory/actions.ts",
  () => actions,
);

const FIRST: Memory = {
  text: "- Block out the den",
  version: MEMORY_VERSION_NUMBER.parse(1),
};
const SECOND: Memory = {
  text: "- Bevel the roof",
  version: MEMORY_VERSION_NUMBER.parse(2),
};

// What stands in for the page's formatted Markdown of a memory.
function formatted(memory: Memory): string {
  return `Formatted: ${memory.text}`;
}

const VIEWER = userIdFixture();

function memoryView(memory: Memory): JSX.Element {
  return (
    <MemoryView memory={memory} projectId={FOX_PROJECT.id} viewer={VIEWER}>
      <p>{formatted(memory)}</p>
    </MemoryView>
  );
}

function editor(): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: MEMORY_COPY.textLabel });
}

function button(name: string): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name, exact: true });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_view_memory", () => {
  test("shows the memory formatted with an Edit button, and no editor", async () => {
    await render(memoryView(FIRST));

    const current = page.getByRole("region", {
      name: MEMORY_COPY.currentLabel,
    });
    await expect.element(current.getByText(formatted(FIRST))).toBeVisible();
    await expect.element(button(MEMORY_COPY.edit)).toBeVisible();
    expect(editor().elements()).toHaveLength(0);
  });
});

describe("use_case_edit_memory", () => {
  test("Edit puts an editor holding the text in place of the formatted memory, and focuses it", async () => {
    await render(memoryView(FIRST));

    await button(MEMORY_COPY.edit).click();

    await expect.element(editor()).toHaveValue(FIRST.text);
    await expect.element(editor()).toHaveFocus();
    expect(page.getByText(formatted(FIRST)).elements()).toHaveLength(0);
    expect(button(MEMORY_COPY.edit).elements()).toHaveLength(0);
  });

  test("saving sends her text and shows the saved memory formatted, with focus back on Edit", async () => {
    const { promise, resolve } = Promise.withResolvers<MemoryFormState>();
    actions.saveMemoryAction.mockReturnValue(promise);
    const screen = await render(memoryView(FIRST));
    await button(MEMORY_COPY.edit).click();

    await editor().fill(SECOND.text);
    await button(MEMORY_COPY.save).click();

    await expect.element(button(MEMORY_COPY.save)).toBeDisabled();
    const [, sent] = actions.saveMemoryAction.mock.lastCall ?? [];
    expect(Object.fromEntries(sent ?? [])).toEqual({
      projectId: FOX_PROJECT.id,
      basedOn: String(FIRST.version),
      text: SECOND.text,
    });
    await screen.rerender(memoryView(SECOND));
    resolve({ kind: "saved" });

    await expect.element(page.getByText(formatted(SECOND))).toBeVisible();
    await expect.element(button(MEMORY_COPY.edit)).toHaveFocus();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(MEMORY_COPY.saved);
    expect(editor().elements()).toHaveLength(0);
  });

  test("her unsaved text is back in the editor when she comes back to the page, until she cancels", async () => {
    const firstVisit = await render(memoryView(FIRST));
    await button(MEMORY_COPY.edit).click();
    await editor().fill(SECOND.text);
    await firstVisit.unmount();

    const secondVisit = await render(memoryView(FIRST));
    await expect.element(editor()).toHaveValue(SECOND.text);
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(MEMORY_COPY.restored);
    expect(actions.saveMemoryAction).not.toHaveBeenCalled();

    await button(MEMORY_COPY.cancelEdit).click();
    await secondVisit.unmount();
    await render(memoryView(FIRST));
    expect(editor().elements()).toHaveLength(0);
    await button(MEMORY_COPY.edit).click();
    await expect.element(editor()).toHaveValue(FIRST.text);
  });

  test("Cancel drops her changes, sends nothing and shows the memory as it was", async () => {
    await render(memoryView(FIRST));
    await button(MEMORY_COPY.edit).click();
    await editor().fill(SECOND.text);

    await button(MEMORY_COPY.cancelEdit).click();

    await expect.element(page.getByText(formatted(FIRST))).toBeVisible();
    await expect.element(button(MEMORY_COPY.edit)).toHaveFocus();
    expect(editor().elements()).toHaveLength(0);
    expect(actions.saveMemoryAction).not.toHaveBeenCalled();

    await button(MEMORY_COPY.edit).click();

    await expect.element(editor()).toHaveValue(FIRST.text);
  });

  test("works from the keyboard alone", async () => {
    await render(memoryView(FIRST));

    await tabForward();
    await expect.element(button(MEMORY_COPY.edit)).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect.element(editor()).toHaveFocus();
    await tabForward();
    await tabForward();
    await expect.element(button(MEMORY_COPY.cancelEdit)).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    await expect.element(button(MEMORY_COPY.edit)).toHaveFocus();
    expect(editor().elements()).toHaveLength(0);
  });
});

describe("use_case_memory_edit_conflict", () => {
  test("a refused save keeps the editor open with her text, under the newer memory", async () => {
    const { promise, resolve } = Promise.withResolvers<MemoryFormState>();
    actions.saveMemoryAction.mockReturnValue(promise);
    const screen = await render(memoryView(FIRST));
    await button(MEMORY_COPY.edit).click();
    await editor().fill("- My own plan");

    await button(MEMORY_COPY.save).click();
    await expect.element(button(MEMORY_COPY.save)).toBeDisabled();
    await screen.rerender(memoryView(SECOND));
    resolve({ kind: "outdated" });

    await expect.element(page.getByText(MEMORY_COPY.outdated)).toBeVisible();
    await expect.element(editor()).toHaveValue("- My own plan");
    await expect
      .element(
        page
          .getByRole("region", { name: MEMORY_COPY.newerLabel })
          .getByText(formatted(SECOND)),
      )
      .toBeVisible();
  });
});
