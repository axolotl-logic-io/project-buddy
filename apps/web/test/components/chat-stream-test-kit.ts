import { createUIMessageStreamResponse, type UIMessageChunk } from "ai";
import { vi } from "vitest";

function answerChat(
  response: Response,
): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(response));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
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

export { answerChat, holdBeforeChunk };
