import { fireEvent, render, screen } from "@testing-library/react";
import {
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { vi } from "vitest";
import { getBuddy } from "@/buddies/index.ts";
import { ChatView } from "@/components/chat-view.tsx";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { chatIdFixture } from "../id-fixtures.ts";

function renderChat(initialMessages: UIMessage[] = []): void {
  render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={initialMessages}
      buddyName={getBuddy("mr-tee").name}
    />,
  );
}

function sendMessage(text = "How do I bevel?"): void {
  fireEvent.change(
    screen.getByRole("textbox", { name: CHAT_COPY.messageLabel }),
    { target: { value: text } },
  );
  fireEvent.click(screen.getByRole("button", { name: CHAT_COPY.send }));
}

function replyChunks(text: string): UIMessageChunk[] {
  return [
    { type: "start", messageId: "new-reply" },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: text },
    { type: "text-end", id: "t1" },
    { type: "finish" },
  ];
}

// A zero-delay stream. Tests hold a chunk or response explicitly when the
// intermediate UI is the behaviour under test.
function replyResponse(chunks: readonly UIMessageChunk[]): Response {
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

function answerChat(
  response: Response,
): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(response));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function holdResponse(): PromiseWithResolvers<Response> {
  const answer = Promise.withResolvers<Response>();
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(() => answer.promise),
  );
  return answer;
}

function holdReply(): Promise<ReadableStreamDefaultController<UIMessageChunk>> {
  const opened =
    Promise.withResolvers<ReadableStreamDefaultController<UIMessageChunk>>();
  answerChat(
    createUIMessageStreamResponse({
      stream: new ReadableStream<UIMessageChunk>({ start: opened.resolve }),
    }),
  );
  return opened.promise;
}

// Sends the prefix now and holds the rest until release, without a timer.
function holdBeforeChunk(
  chunks: readonly UIMessageChunk[],
  index: number,
): { response: Response; release: () => void } {
  const released = Promise.withResolvers<void>();
  const response = createUIMessageStreamResponse({
    stream: new ReadableStream<UIMessageChunk>({
      async start(
        controller: ReadableStreamDefaultController<UIMessageChunk>,
      ): Promise<void> {
        for (const chunk of chunks.slice(0, index)) {
          controller.enqueue(chunk);
        }
        await released.promise;
        for (const chunk of chunks.slice(index)) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    }),
  });
  return { response, release: released.resolve };
}

export {
  answerChat,
  holdBeforeChunk,
  holdReply,
  holdResponse,
  renderChat,
  replyChunks,
  replyResponse,
  sendMessage,
};
