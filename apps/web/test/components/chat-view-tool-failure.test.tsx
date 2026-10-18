// "use_case_tutor_updates_memory" in use-cases/chats.md, its failure line as
// the reply streams: an update_memory call whose input the tool's schema
// refuses fails, and the live reply and the saved one say the memory update
// failed. That the chat saves the failed call, and that the memory is
// unchanged, is test/app/api/chat/reply-failures.server.test.ts's.
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  createUIMessageStreamResponse,
  simulateReadableStream,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { getBuddy } from "@/buddies/index.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";
import { CHAT_COPY, TOOL_FAILURES_COPY } from "@/ui/copy/chat.ts";
import { chatIdFixture } from "../id-fixtures.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("./router-test-kit.ts"));

// The reply to `/mock-tool update_memory {"oldText":1}`: the call's input
// is refused, so the call fails before it runs.
const MALFORMED_EDIT_REPLY: UIMessageChunk[] = [
  { type: "start", messageId: "r1" },
  { type: "start-step" },
  {
    type: "tool-input-error",
    toolCallId: "call-memory",
    toolName: UPDATE_MEMORY_TOOL,
    input: { oldText: 1 },
    errorText: "Invalid input for tool update_memory",
  },
  { type: "finish-step" },
  { type: "finish" },
];

// The same reply as the chat saves it, which a reload shows.
const SAVED_MALFORMED_EDIT_REPLY: UIMessage = {
  id: "r1",
  role: "assistant",
  parts: [
    { type: "step-start" },
    {
      type: `tool-${UPDATE_MEMORY_TOOL}`,
      toolCallId: "call-memory",
      state: "output-error",
      input: { oldText: 1 },
      errorText: "Invalid input for tool update_memory",
    },
  ],
};

// The conversation's last message.
function lastMessage(): HTMLElement {
  const conversation = screen.getByRole("list", {
    name: CHAT_COPY.conversationLabel,
  });
  const last = conversation.lastElementChild;
  if (!(last instanceof HTMLElement)) {
    throw new Error("The conversation is empty");
  }
  return last;
}

function renderChat(initialMessages: UIMessage[]): void {
  render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={initialMessages}
      buddyName={getBuddy("mr-tee").name}
    />,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("use_case_tutor_updates_memory", () => {
  test("a malformed memory edit shows the failure line in the live reply", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          createUIMessageStreamResponse({
            stream: simulateReadableStream({ chunks: MALFORMED_EDIT_REPLY }),
          }),
        ),
      ),
    );
    renderChat([]);

    fireEvent.change(
      screen.getByRole("textbox", { name: CHAT_COPY.messageLabel }),
      { target: { value: `/mock-tool update_memory {"oldText":1}` } },
    );
    fireEvent.click(screen.getByRole("button", { name: CHAT_COPY.send }));

    await vi.waitFor(() => {
      expect(
        within(lastMessage()).getByText(TOOL_FAILURES_COPY.updateMemory),
      ).toBeVisible();
    });
  });

  test("the saved reply shows the failure line after a reload", () => {
    renderChat([SAVED_MALFORMED_EDIT_REPLY]);

    expect(
      within(lastMessage()).getByText(TOOL_FAILURES_COPY.updateMemory),
    ).toBeVisible();
  });
});
