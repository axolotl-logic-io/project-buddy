import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { JSX } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { FOX_PROJECT } from "@/app/(workspace)/page-fixtures.ts";
import { MEMORY_VERSION_NUMBER, type Memory } from "@/memory/memory.ts";
import type { saveMemoryAction } from "./actions.ts";
import { MemoryEditor } from "./memory-editor.tsx";

const actions = vi.hoisted(() => ({
  saveMemoryAction: vi.fn<typeof saveMemoryAction>(),
}));
vi.mock("./actions.ts", () => actions);

const SECOND = 2;
const THIRD = 3;
const MEMORY: Memory = {
  text: "# Goals",
  version: MEMORY_VERSION_NUMBER.parse(SECOND),
};
const NEWER: Memory = {
  text: "# Goals\n\n- Rig the fox",
  version: MEMORY_VERSION_NUMBER.parse(THIRD),
};

function editor(memory: Memory): JSX.Element {
  return <MemoryEditor memory={memory} projectId={FOX_PROJECT.id} />;
}

function memoryField(): HTMLElement {
  return screen.getByRole("textbox", { name: "Memory" });
}

function typeInMemory(text: string): void {
  fireEvent.change(memoryField(), { target: { value: text } });
}

// Waits until the status line says text. The status line is always on the
// page, empty until a save answers, so finding it proves nothing: wait for
// what she reads in it.
async function expectStatus(text: string): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent(text);
  });
}

// The fields of the form the editor last sent.
function sentFields(): Record<string, FormDataEntryValue> {
  const [, sent] = actions.saveMemoryAction.mock.lastCall ?? [];
  return Object.fromEntries(sent ?? new FormData());
}

beforeEach(() => {
  vi.clearAllMocks();
  actions.saveMemoryAction.mockResolvedValue({ kind: "saved" });
});

describe("use_case_edit_memory", () => {
  test("saves her text based on the version it shows", async () => {
    render(editor(MEMORY));
    typeInMemory("# My goals");

    fireEvent.click(screen.getByRole("button", { name: "Save memory" }));

    await expectStatus("Saved.");
    expect(sentFields()).toEqual({
      projectId: FOX_PROJECT.id,
      basedOn: String(SECOND),
      text: "# My goals",
    });
  });

  test("shows a newer version when she has not changed the text", () => {
    const { rerender } = render(editor(MEMORY));

    rerender(editor(NEWER));

    expect(memoryField()).toHaveValue(NEWER.text);
  });
});

describe("use_case_memory_edit_conflict", () => {
  test("says a refused save was refused, and keeps her text", async () => {
    actions.saveMemoryAction.mockResolvedValue({ kind: "outdated" });
    render(editor(MEMORY));
    typeInMemory("# My goals");

    fireEvent.click(screen.getByRole("button", { name: "Save memory" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The memory changed since you started editing",
    );
    expect(memoryField()).toHaveValue("# My goals");
  });

  test("keeps her unsaved text when a newer version arrives, now based on it", async () => {
    const { rerender } = render(editor(MEMORY));
    typeInMemory("# My goals");

    rerender(editor(NEWER));
    fireEvent.click(screen.getByRole("button", { name: "Save memory" }));

    expect(memoryField()).toHaveValue("# My goals");
    await expectStatus("Saved.");
    expect(sentFields()).toHaveProperty("basedOn", String(THIRD));
  });
});
