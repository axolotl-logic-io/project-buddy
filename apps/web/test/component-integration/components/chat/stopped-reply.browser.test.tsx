// A chat reopened after its last reply stopped, such as after a failure, in
// Chromium and WebKit: it says the construct didn't reply and offers Retry
// reply, which asks again for the same message without sending it twice
// and moves focus to the message box, as the button goes. While the reply
// runs, Stop reply takes Send's place in the message box.
// Which message stopped is reply-failures.server.test.ts's.

import { createUIMessageStreamResponse, type UIMessageChunk } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { ChatMessage } from "@/chats/message-author.ts";
import { ChatScreen } from "@/components/chat-screen.tsx";
import { ChatView } from "@/components/chat-view.tsx";
import { appErrorResponse, userMessage } from "@/errors/app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { replyGoldAction } from "@/replies/reply-gold-action.ts";
import { stopReplyAction } from "@/replies/stop-reply-action.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { IMAGE_COPY } from "@/ui/copy/images.ts";
import { chatIdFixture, userIdFixture } from "../../../support/id-fixtures.ts";
import { FOX_CHAT } from "../../app/(workspace)/page-fixtures.ts";
import { SIGNED_IN_USER } from "../../auth/current-user-test-kit.ts";
import { refresh } from "../router-test-kit.ts";

vi.mock(
  "@/plan/plan-actions.ts",
  () => import("../../plan/plan-actions-test-kit.ts"),
);

vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const INITIAL_BALANCE = 100;
const SETTLED_BALANCE = 98;
const ACCOUNTING_POLL_MS = 2000;
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

// Whether the button named name sits at the message box's end, in its row,
// where Send is.
function besideMessageBox(name: string): boolean {
  const box = page
    .getByRole("textbox", { name: CHAT_COPY.messageLabel })
    .element()
    .getBoundingClientRect();
  const button = page
    .getByRole("button", { name })
    .element()
    .getBoundingClientRect();
  return (
    button.left >= box.right &&
    button.top < box.bottom &&
    button.bottom > box.top
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.mocked(replyGoldAction).mockReset();
  refresh.mockClear();
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
        conversation={FOX_CHAT}
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
        conversation={FOX_CHAT}
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

describe("use_case_stop_reply", () => {
  test("Stop takes Send's place, waits for the server, and a failed request leaves the stream running", async () => {
    let output: ReadableStreamDefaultController<UIMessageChunk> | undefined;
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        createUIMessageStreamResponse({
          stream: new ReadableStream<UIMessageChunk>({
            start(
              controller: ReadableStreamDefaultController<UIMessageChunk>,
            ): void {
              output = controller;
              controller.enqueue({ type: "start", messageId: "running-reply" });
              controller.enqueue({ type: "text-start", id: "text" });
              controller.enqueue({
                type: "text-delta",
                id: "text",
                delta: REPLY,
              });
            },
          }),
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const chatId = chatIdFixture();
    try {
      await render(
        <ChatView
          viewer={userIdFixture()}
          constructName="Vellum"
          chatId={chatId}
          initialMessages={[STOPPED]}
          stoppedReplyId={STOPPED.id}
        />,
      );
      await page.getByRole("button", { name: IMAGE_COPY.retry }).click();
      await expect.element(page.getByText(REPLY)).toBeVisible();
      await expect
        .element(page.getByRole("button", { name: CHAT_COPY.stop }))
        .toBeVisible();
      expect(besideMessageBox(CHAT_COPY.stop)).toBe(true);
      await expect
        .element(page.getByRole("button", { name: CHAT_COPY.send }))
        .not.toBeInTheDocument();
      vi.mocked(stopReplyAction).mockRejectedValueOnce(
        new Error("Unavailable"),
      );
      await page.getByRole("button", { name: CHAT_COPY.stop }).click();
      await expect.element(page.getByText(CHAT_COPY.stopFailed)).toBeVisible();
      await expect
        .element(page.getByRole("button", { name: CHAT_COPY.stop }))
        .toBeEnabled();
      const acknowledged =
        Promise.withResolvers<Awaited<ReturnType<typeof stopReplyAction>>>();
      vi.mocked(stopReplyAction).mockReturnValueOnce(acknowledged.promise);
      refresh.mockClear();
      await page.getByRole("button", { name: CHAT_COPY.stop }).click();
      await expect.element(page.getByText(CHAT_COPY.stopping)).toBeVisible();
      await expect
        .element(page.getByText(CHAT_COPY.cancelledReply))
        .not.toBeInTheDocument();
      expect(stopReplyAction).toHaveBeenLastCalledWith({
        chatId,
        messageId: STOPPED.id,
      });
      acknowledged.resolve("active");
      // The page showing the conversation, a quest's or Chat, is refreshed
      // once the stop is acknowledged.
      await expect.poll(() => refresh.mock.calls.length).toBeGreaterThan(0);
      output?.enqueue({ type: "abort" });
      output?.close();
      output = undefined;
      await expect
        .element(page.getByRole("button", { name: CHAT_COPY.stop }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: CHAT_COPY.send }))
        .toBeVisible();
      expect(besideMessageBox(CHAT_COPY.send)).toBe(true);
      await expect
        .element(page.getByRole("textbox", { name: CHAT_COPY.messageLabel }))
        .toHaveFocus();
    } finally {
      output?.close();
    }
  });
});

describe("use_case_see_gold", () => {
  test("idle accounting seeds the balance and late settlement refreshes only when it changes", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const viewer = userIdFixture();
    const pending = {
      viewer,
      balance: 100,
      costs: [{ messageId: STOPPED.id, gold: 0, state: "pending" }],
    } satisfies NonNullable<Awaited<ReturnType<typeof replyGoldAction>>>;
    vi.mocked(replyGoldAction).mockResolvedValue(pending);
    await render(
      <ChatView
        viewer={viewer}
        constructName="Vellum"
        chatId={chatIdFixture()}
        initialMessages={[STOPPED]}
        stoppedReplyId={STOPPED.id}
      />,
    );
    await expect
      .element(
        page.getByText(CHAT_COPY.balance(INITIAL_BALANCE), { exact: true }),
      )
      .toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(ACCOUNTING_POLL_MS);
    expect(refresh).not.toHaveBeenCalled();
    vi.mocked(replyGoldAction).mockResolvedValue({
      ...pending,
      balance: 98,
      costs: [{ messageId: STOPPED.id, gold: 2, state: "actual" }],
    });
    await vi.advanceTimersByTimeAsync(ACCOUNTING_POLL_MS);
    await expect
      .element(
        page.getByText(CHAT_COPY.balance(SETTLED_BALANCE), { exact: true }),
      )
      .toBeVisible();
    await expect.poll(() => refresh.mock.calls.length).toBe(1);
  });

  test("a reply finishing before the first balance read still refreshes settled accounting", async () => {
    const viewer = userIdFixture();
    const first =
      Promise.withResolvers<Awaited<ReturnType<typeof replyGoldAction>>>();
    const settled =
      Promise.withResolvers<Awaited<ReturnType<typeof replyGoldAction>>>();
    vi.mocked(replyGoldAction)
      .mockReturnValueOnce(first.promise)
      .mockReturnValue(settled.promise);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(reply())),
    );
    await render(
      <ChatView
        viewer={viewer}
        constructName="Vellum"
        chatId={chatIdFixture()}
        initialMessages={[STOPPED]}
        stoppedReplyId={STOPPED.id}
      />,
    );
    await page.getByRole("button", { name: IMAGE_COPY.retry }).click();
    await expect.element(page.getByText(REPLY)).toBeVisible();
    await expect.poll(() => refresh.mock.calls.length).toBe(1);
    // The finish refresh can precede accounting. Its later first known
    // balance must refresh again rather than becoming an idle baseline.
    settled.resolve({ viewer, balance: 98, costs: [] });
    await expect
      .element(
        page.getByText(CHAT_COPY.balance(SETTLED_BALANCE), { exact: true }),
      )
      .toBeVisible();
    await expect.poll(() => refresh.mock.calls.length).toBe(2);
    first.resolve({ viewer, balance: 100, costs: [] });
  });
});

describe("use_case_session_expired_in_chat", () => {
  test("a refused reply keeps its signed-out message without refreshing to sign in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          appErrorResponse("signed-out", HTTP_STATUS.unauthorized),
        ),
      ),
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

    await page.getByRole("button", { name: IMAGE_COPY.retry }).click();

    await expect
      .element(
        page
          .getByRole("alert")
          .getByText(userMessage("signed-out"), { exact: true }),
      )
      .toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
  });
});
