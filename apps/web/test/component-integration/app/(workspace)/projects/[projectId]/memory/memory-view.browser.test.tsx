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
import { Markdown } from "@/components/markdown.tsx";
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

function memoryView(memory: Memory): JSX.Element {
  return (
    <MemoryView
      viewer={userIdFixture("11111111-1111-4111-8111-111111111111")}
      memory={memory}
      projectId={FOX_PROJECT.id}
    >
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

  test("Cancel drops her changes, sends nothing and shows the memory as it was", async () => {
    await render(memoryView(FIRST));
    await button(MEMORY_COPY.edit).click();
    await editor().fill(SECOND.text);

    await button("Discard changes").click();

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
    await expect.element(button("Discard changes")).toHaveFocus();
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

describe("memory line breaks", () => {
  test("separate goal and next-step lines remain visibly separate", async () => {
    const memoryText = "Goal: Build a den\nNext step: Cut the boards";
    const measuredCharacters = "Goal".length;
    await render(
      <div className="memory-text">
        <Markdown running={false} text={memoryText} />
      </div>,
    );
    const paragraph = page
      .getByText("Goal: Build a den", { exact: false })
      .element();
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    const node = walker.nextNode();
    if (node === null) {
      throw new Error("No memory text rendered");
    }
    const text = node.textContent ?? "";
    const next = text.indexOf("Next step");
    expect(next).toBeGreaterThan(0);
    const goalRange = document.createRange();
    goalRange.setStart(node, 0);
    goalRange.setEnd(node, measuredCharacters);
    const nextRange = document.createRange();
    nextRange.setStart(node, next);
    nextRange.setEnd(node, next + measuredCharacters);
    expect(nextRange.getBoundingClientRect().top).toBeGreaterThan(
      goalRange.getBoundingClientRect().top,
    );
  });
});

test("keeps an unsaved memory across visits, discards it explicitly and drops stale versions", async () => {
  const first = await render(memoryView(FIRST));
  await button(MEMORY_COPY.edit).click();
  await editor().fill("Private unsaved memory");
  await first.unmount();
  const second = await render(memoryView(FIRST));
  await expect.element(editor()).toHaveValue("Private unsaved memory");
  await button(MEMORY_COPY.cancelEdit).click();
  await second.unmount();
  const third = await render(memoryView(FIRST));
  await button(MEMORY_COPY.edit).click();
  await expect.element(editor()).toHaveValue(FIRST.text);
  await editor().fill("Older draft");
  await third.unmount();
  await render(memoryView(SECOND));
  await button(MEMORY_COPY.edit).click();
  await expect.element(editor()).toHaveValue(SECOND.text);
});

test("another viewer cannot restore a private memory draft", async () => {
  const first = await render(memoryView(FIRST));
  await button(MEMORY_COPY.edit).click();
  await editor().fill("Private memory draft");
  await first.unmount();
  await render(
    <MemoryView
      viewer={userIdFixture("22222222-2222-4222-8222-222222222222")}
      projectId={FOX_PROJECT.id}
      memory={FIRST}
    >
      <p>{formatted(FIRST)}</p>
    </MemoryView>,
  );
  await button(MEMORY_COPY.edit).click();
  await expect.element(editor()).toHaveValue(FIRST.text);
});
