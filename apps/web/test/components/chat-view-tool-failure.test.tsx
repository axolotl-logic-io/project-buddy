// "use_case_tutor_updates_memory" in use-cases/chats.md, its failure line as
// the reply streams: an update_memory call whose input the tool's schema
// refuses fails, and the live reply and the saved one say the memory update
// failed. That the chat saves the failed call, and that the memory is
// unchanged, is test/app/api/chat/reply-failures.server.test.ts's.
import { screen, within } from "@testing-library/react";
import type { UIMessageChunk } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";
import { CHAT_COPY, TOOL_FAILURES_COPY } from "@/ui/copy/chat.ts";
import {
  answerChat,
  renderChat,
  replyResponse,
  sendMessage,
} from "./chat-view-test-kit.tsx";

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("use_case_tutor_updates_memory", () => {
  test("a malformed memory edit shows the failure line in the live reply", async () => {
    answerChat(replyResponse(MALFORMED_EDIT_REPLY));
    renderChat();
    sendMessage(`/mock-tool update_memory {"oldText":1}`);

    await vi.waitFor(() => {
      expect(
        within(lastMessage()).getByText(TOOL_FAILURES_COPY.updateMemory),
      ).toBeVisible();
    });
  });
});
