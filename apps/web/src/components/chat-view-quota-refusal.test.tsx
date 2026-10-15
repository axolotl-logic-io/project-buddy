// ChatView when the server refuses a message because her quota is used up:
// the message was never saved, so the view takes it back (chat-view.tsx's
// takeBackRefusedMessage).
import { fireEvent, render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { getBuddy } from "@/buddies/index.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { HTTP_STATUS } from "@/http-status.ts";
import { chatIdFixture } from "@/id-fixtures.ts";
import { quotaUsedUpResponse } from "@/tutor/chat-protocol.ts";
import { CHAT_COPY, quotaUsedUpMessage } from "@/ui/copy/chat.ts";

const BUDDY_NAME: string = getBuddy("mr-tee").name;

vi.mock("next/navigation", () => import("@/components/router-test-kit.ts"));

const RESETS_ON = new Date("2026-11-01T00:00:00.000Z");
const REFUSED = "How do I bevel?";

const savedMessages: UIMessage[] = [
  { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
  {
    id: "m2",
    role: "assistant",
    parts: [{ type: "text", text: "Hello, fool." }],
  },
];

function messageBox(): HTMLElement {
  return screen.getByRole("textbox", { name: CHAT_COPY.messageLabel });
}

// The conversation's messages: the items of its list, not of any list in a
// reply.
function conversationItems(): readonly Element[] {
  const conversation = screen.getByRole("list", {
    name: CHAT_COPY.conversationLabel,
  });
  return [...conversation.children];
}

// Sends REFUSED in a chat that holds initialMessages (the saved chat unless
// given) and waits until the conversation shows it; the request is answered
// with response only when the returned function is called. The message list
// can render a tick after the alert, so each test waits for the end state it
// expects, not for the alert alone.
async function sendRefused(
  response: Response,
  initialMessages: UIMessage[] = savedMessages,
): Promise<() => void> {
  const answer = Promise.withResolvers<Response>();
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(() => answer.promise),
  );
  render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={initialMessages}
      buddyName={BUDDY_NAME}
    />,
  );
  fireEvent.change(messageBox(), { target: { value: REFUSED } });
  fireEvent.click(screen.getByRole("button", { name: CHAT_COPY.send }));
  await screen.findByText(REFUSED);
  return (): void => {
    answer.resolve(response);
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ChatView quota refusal", () => {
  test("takes back the refused message, with no empty reply, and gives her its text back", async () => {
    const answer = await sendRefused(quotaUsedUpResponse(RESETS_ON));
    answer();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      quotaUsedUpMessage(RESETS_ON),
    );
    await vi.waitFor(() => {
      expect(conversationItems()).toHaveLength(savedMessages.length);
    });
    expect(messageBox()).toHaveValue(REFUSED);
  });

  test("keeps what she typed after sending instead of the refused text", async () => {
    const answer = await sendRefused(quotaUsedUpResponse(RESETS_ON));
    fireEvent.change(messageBox(), { target: { value: "Never mind" } });
    answer();

    await screen.findByRole("alert");
    await vi.waitFor(() => {
      expect(conversationItems()).toHaveLength(savedMessages.length);
    });
    expect(messageBox()).toHaveValue("Never mind");
  });

  test("leaves the message and the box alone for any other failure", async () => {
    const answer = await sendRefused(
      new Response("database-unreachable", {
        status: HTTP_STATUS.internalServerError,
      }),
    );
    answer();

    await screen.findByRole("alert");
    expect(screen.getByText(REFUSED)).toBeInTheDocument();
    expect(messageBox()).toHaveValue("");
  });
});

describe("ChatView quota refusal in an empty chat", () => {
  test("leaves an empty chat empty when its first message is refused", async () => {
    const answer = await sendRefused(quotaUsedUpResponse(RESETS_ON), []);
    answer();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      quotaUsedUpMessage(RESETS_ON),
    );
    await vi.waitFor(() => {
      expect(messageBox()).toHaveValue(REFUSED);
    });
    expect(conversationItems()).toHaveLength(0);
  });

  test("clears the refusal's alert when she sends again", async () => {
    const answer = await sendRefused(quotaUsedUpResponse(RESETS_ON), []);
    answer();
    await screen.findByRole("alert");
    await vi.waitFor(() => {
      expect(messageBox()).toHaveValue(REFUSED);
    });

    // Her second try waits on an answer that never comes.
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => Promise.withResolvers<Response>().promise),
    );
    fireEvent.click(screen.getByRole("button", { name: CHAT_COPY.send }));

    await screen.findByText(REFUSED);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
