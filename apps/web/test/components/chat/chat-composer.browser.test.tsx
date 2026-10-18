// "use_case_send_message" in use-cases/chats.md, in Chromium and WebKit:
// her typing survives the reply finishing while she types. The test's fetch
// holds the chat stream's `finish` chunk, and everything after it, until the
// test lets it through, so the reply's text shows while its run is still
// going: the moment the round 2 merge saw WebKit drop text typed into the
// composer.
import type { UIMessageChunk } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { getBuddy } from "@/buddies/index.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { CHAT_API_PATH } from "@/tutor/chat-protocol.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { chatIdFixture } from "../../id-fixtures.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const QUESTION = "How do I bevel an edge?";
const REPLY = "Select the edge and press Ctrl+B.";
const NEXT_MESSAGE = "And then how do I smooth it?";

// The chunks of the reply, up to its `finish`, as the chat route streams
// them (AI SDK's UI message stream).
const CHUNKS_BEFORE_FINISH: readonly UIMessageChunk[] = [
  { type: "start", messageId: "r1" },
  { type: "start-step" },
  { type: "text-start", id: "t1" },
  { type: "text-delta", id: "t1", delta: REPLY },
  { type: "text-end", id: "t1" },
  { type: "finish-step" },
];
const FINISH_CHUNK: UIMessageChunk = { type: "finish" };

// A chat reply whose `finish` is held: held is true once everything before
// it has been sent, and release() lets it through.
interface HeldFinish {
  readonly isHeld: () => boolean;
  readonly release: () => void;
}

function eventLine(data: string): Uint8Array {
  return new TextEncoder().encode(`data: ${data}\n\n`);
}

// Stubs fetch so that a request to the chat route is answered with a reply
// stream that stops just before its `finish` until release() is called.
function holdChatFinish(): HeldFinish {
  const finish = Promise.withResolvers<void>();
  let held = false;
  function replyBody(): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
      async start(
        controller: ReadableStreamDefaultController<Uint8Array>,
      ): Promise<void> {
        for (const chunk of CHUNKS_BEFORE_FINISH) {
          controller.enqueue(eventLine(JSON.stringify(chunk)));
        }
        held = true;
        await finish.promise;
        held = false;
        controller.enqueue(eventLine(JSON.stringify(FINISH_CHUNK)));
        controller.enqueue(eventLine("[DONE]"));
        controller.close();
      },
    });
  }
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((input) => {
      if (!new Request(input).url.endsWith(CHAT_API_PATH)) {
        return Promise.reject(
          new Error(`Unexpected fetch of ${String(input)}`),
        );
      }
      return Promise.resolve(
        new Response(replyBody(), {
          headers: {
            "content-type": "text/event-stream",
            "x-vercel-ai-ui-message-stream": "v1",
          },
        }),
      );
    }),
  );
  return {
    isHeld: (): boolean => held,
    release: (): void => {
      finish.resolve();
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("use_case_send_message", () => {
  test("her typing survives the reply finishing while she types", async () => {
    const heldFinish = holdChatFinish();
    await render(
      <ChatView
        chatId={chatIdFixture()}
        initialMessages={[]}
        buddyName={getBuddy("mr-tee").name}
      />,
    );
    const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
    const send = page.getByRole("button", { name: CHAT_COPY.send });
    const lastMessage = page.getByRole("listitem").last();

    // The reply's text shows while its finish is held.
    await box.fill(QUESTION);
    await send.click();
    await expect.poll(heldFinish.isHeld).toBe(true);
    await expect.element(lastMessage.getByText(REPLY)).toBeVisible();
    await expect.element(lastMessage).toHaveAttribute("aria-busy", "true");

    // She types her next message before the reply finishes.
    await box.fill(NEXT_MESSAGE);
    await expect.element(box).toHaveValue(NEXT_MESSAGE);
    await expect.element(send).toBeDisabled();

    // The reply finishes, and her message is still there to send.
    heldFinish.release();
    await expect.element(lastMessage).toHaveAttribute("aria-busy", "false");
    await expect.element(box).toHaveValue(NEXT_MESSAGE);
    await expect.element(send).toBeEnabled();
  });
});
