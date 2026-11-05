// A chat reopened after its last reply stopped, such as after a failure, in
// Chromium and WebKit: it says the construct didn't reply and offers Retry
// reply, which asks again for the same message without sending it twice
// and moves focus to the message box, as the button goes.
// Which message stopped is reply-failures.server.test.ts's.
import { createUIMessageStreamResponse, type UIMessageChunk } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { ChatMessage } from "@/chats/message-author.ts";
import { ChatScreen } from "@/components/chat-screen.tsx";
import { ChatView } from "@/components/chat-view.tsx";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { IMAGE_COPY } from "@/ui/copy/images.ts";
import { chatIdFixture, userIdFixture } from "../../../support/id-fixtures.ts";
import { FOX_CHAT } from "../../app/(workspace)/page-fixtures.ts";
import { SIGNED_IN_USER } from "../../auth/current-user-test-kit.ts";
import { refresh } from "../router-test-kit.ts";

vi.mock("@/app/(workspace)/chats/[chatId]/actions.ts", () => ({
  renameChatAction: vi.fn(),
}));

vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const REPLY = "Here I am.";
const STOPPED: ChatMessage = {
  id: "stopped-message",
  role: "user",
  parts: [{ type: "text", text: "Are you there?" }],
};

function reply(): Response {
  const chunks: UIMessageChunk[] = [
    { type: "start", messageId: "reply" },
    { type: "text-start", id: "text" },
    { type: "text-delta", id: "text", delta: REPLY },
    { type: "text-end", id: "text" },
    { type: "finish" },
  ];
  return createUIMessageStreamResponse({
    stream: new ReadableStream<UIMessageChunk>({
      start(controller: ReadableStreamDefaultController<UIMessageChunk>): void {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    }),
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("use_case_reply_fails", () => {
  test("a reopened chat whose reply stopped offers Retry reply, which answers the same message", async () => {
    const sent: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((_input, init) => {
        sent.push(JSON.parse(String(init?.body)));
        return Promise.resolve(reply());
      }),
    );
    await render(
      <ChatView
        viewer={userIdFixture()}
        constructName="Vellum"
        chatId={chatIdFixture()}
        initialMessages={[STOPPED]}
        stoppedReplyId={STOPPED.id}
      />,
    );

    const notice = page.getByText(CHAT_COPY.replyStopped("Vellum"));
    await expect.element(notice).toBeVisible();
    await page.getByRole("button", { name: IMAGE_COPY.retry }).click();

    await expect.element(page.getByText(REPLY)).toBeVisible();
    await expect
      .element(page.getByRole("textbox", { name: CHAT_COPY.messageLabel }))
      .toHaveFocus();
    expect(notice.elements()).toHaveLength(0);
    expect(sent).toEqual([
      expect.objectContaining({
        message: expect.objectContaining({ id: STOPPED.id }),
      }),
    ]);
    expect(page.getByText("Are you there?").elements()).toHaveLength(1);
  });

  test("a saved external reply keeps the waiting viewer's draft and focus", async () => {
    const view = await render(
      <ChatScreen
        chat={FOX_CHAT}
        messages={[STOPPED]}
        stoppedReplyId={undefined}
        viewer={SIGNED_IN_USER.id}
      />,
    );
    const composer = page.getByRole("textbox", {
      name: CHAT_COPY.messageLabel,
    });
    await composer.fill("My next question, still unsent");
    await view.rerender(
      <ChatScreen
        chat={FOX_CHAT}
        viewer={SIGNED_IN_USER.id}
        stoppedReplyId={undefined}
        messages={[
          STOPPED,
          {
            id: "external-reply",
            role: "assistant",
            parts: [{ type: "text", text: REPLY }],
          },
        ]}
      />,
    );
    await expect.element(page.getByText(REPLY)).toBeVisible();
    await expect
      .element(composer)
      .toHaveValue("My next question, still unsent");
    await expect.element(composer).toHaveFocus();
    expect(page.getByText("Are you there?").elements()).toHaveLength(1);
    expect(
      page.getByText(CHAT_COPY.replyingElsewhere("Vellum")).elements(),
    ).toHaveLength(0);
  });

  test("a reopened chat whose last message is being answered offers no retry", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    refresh.mockClear();
    await render(
      <ChatView
        viewer={userIdFixture()}
        constructName="Vellum"
        chatId={chatIdFixture()}
        initialMessages={[STOPPED]}
        stoppedReplyId={undefined}
      />,
    );

    await expect.element(page.getByText("Are you there?")).toBeVisible();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(CHAT_COPY.replyingElsewhere("Vellum"));
    vi.advanceTimersToNextTimer();
    expect(refresh).toHaveBeenCalled();
    expect(
      page.getByText(CHAT_COPY.replyStopped("Vellum")).elements(),
    ).toHaveLength(0);
    expect(
      page.getByRole("button", { name: IMAGE_COPY.retry }).elements(),
    ).toHaveLength(0);
  });
});
