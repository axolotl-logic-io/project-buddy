import { render, screen, within } from "@testing-library/react";
import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";
import { ChatView } from "@/components/chat-view.tsx";
import { chatIdFixture } from "@/id-fixtures.ts";
import {
  UPDATE_MEMORY_TOOL,
  type UpdateMemoryOutput,
} from "@/tutor/tools/update-memory-contract.ts";
import { COPY } from "@/ui/copy.ts";

const EDIT = { oldText: "- Rig it", newText: "- Rig it (done)" };

// A saved reply in which the tutor called update_memory, with this part.
function renderSavedCall(part: UIMessage["parts"][number]): void {
  render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={[{ id: "r1", role: "assistant", parts: [part] }]}
      personaName="Mr. Tee"
    />,
  );
}

// A saved reply in which the tutor called update_memory and got output.
function renderSavedChange(output: UpdateMemoryOutput): void {
  renderSavedCall({
    type: `tool-${UPDATE_MEMORY_TOOL}`,
    toolCallId: "call-1",
    state: "output-available",
    input: EDIT,
    output,
  });
}

describe("MemoryChangePart", () => {
  test("shows a saved change apart from the tutor's words, with what it removed and added", () => {
    renderSavedChange({ status: "updated", version: 3, ...EDIT });

    const notice = screen.getByRole("complementary", { name: "Memory change" });
    expect(notice).toHaveClass("card");
    expect(notice).toHaveTextContent(
      "Updated the project's memory (version 3)",
    );
    expect(within(notice).getByText(EDIT.oldText).tagName).toBe("DEL");
    expect(within(notice).getByText(EDIT.newText).tagName).toBe("INS");
  });

  test("says when the change did not apply", () => {
    renderSavedChange({
      status: "not-applied",
      reason: "missing",
      memory: "Other",
    });

    expect(
      screen.getByText(
        "The tutor's change to the project's memory did not apply.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  test("says the update failed when the tool call failed", () => {
    renderSavedCall({
      type: `tool-${UPDATE_MEMORY_TOOL}`,
      toolCallId: "call-1",
      state: "output-error",
      input: EDIT,
      errorText: "The database is down",
    });

    expect(
      screen.getByText(COPY.toolFailures.updateMemory),
    ).toBeInTheDocument();
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(document.body).not.toHaveTextContent("The database is down");
  });
});
