import { createUIMessageStreamResponse, type UIMessageChunk } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChatView } from "@/components/chat-view.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { IMAGE_COPY } from "@/ui/copy/images.ts";
import { chatIdFixture } from "../../../support/id-fixtures.ts";
import { pngBytes } from "../../../support/images/image-fixtures.ts";

vi.mock("next/navigation", () => import("../router-test-kit.ts"));
const IMAGE_URL = "/api/images/00000000-0000-4000-8000-000000000001";
const REPLY = "I can see your image.";
const REPLY_CHUNKS: UIMessageChunk[] = [
  { type: "start", messageId: "reply" },
  { type: "text-start", id: "text" },
  { type: "text-delta", id: "text", delta: REPLY },
  { type: "text-end", id: "text" },
  { type: "finish" },
];
function reply(): Response {
  return createUIMessageStreamResponse({
    stream: new ReadableStream<UIMessageChunk>({
      start(controller: ReadableStreamDefaultController<UIMessageChunk>): void {
        for (const chunk of REPLY_CHUNKS) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    }),
  });
}
function paste(file: File): void {
  const box = page
    .getByRole("textbox", { name: CHAT_COPY.messageLabel })
    .element();
  const clipboardData = new DataTransfer();
  clipboardData.items.add(file);
  box.dispatchEvent(
    new ClipboardEvent("paste", {
      clipboardData,
      bubbles: true,
      cancelable: true,
    }),
  );
}
function imageFile(): File {
  return new File([pngBytes()], "pixel.png", { type: "image/png" });
}
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("use_case_chat_images", () => {
  test("paste previews can be removed, image-only messages send and remain visible when reopened", async () => {
    const sent: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((input, init) => {
        if (String(input).startsWith("/api/images?")) {
          return Promise.resolve(Response.json({ url: IMAGE_URL }));
        }
        sent.push(JSON.parse(String(init?.body)));
        return Promise.resolve(reply());
      }),
    );
    const view = await render(
      <ChatView
        chatId={chatIdFixture()}
        initialMessages={[]}
        buddyName="Hippy"
      />,
    );
    paste(imageFile());
    await expect
      .element(page.getByRole("img", { name: "pixel.png" }))
      .toBeVisible();
    await page.getByRole("button", { name: IMAGE_COPY.remove }).click();
    await expect
      .element(page.getByRole("img", { name: "pixel.png" }))
      .not.toBeInTheDocument();
    paste(imageFile());
    await expect
      .element(page.getByRole("img", { name: "pixel.png" }))
      .toBeVisible();
    await page.getByRole("button", { name: CHAT_COPY.send }).click();
    await expect.element(page.getByText(REPLY)).toBeVisible();
    expect(sent).toEqual([
      expect.objectContaining({
        message: expect.objectContaining({
          parts: [
            expect.objectContaining({
              type: "file",
              mediaType: "image/png",
              url: expect.stringContaining(IMAGE_URL),
            }),
          ],
        }),
      }),
    ]);
    await expect
      .element(page.getByRole("img", { name: "pixel.png" }))
      .toBeVisible();
    await view.unmount();
    await render(
      <ChatView
        chatId={chatIdFixture()}
        buddyName="Hippy"
        initialMessages={[
          {
            id: "saved",
            role: "user",
            parts: [
              {
                type: "file",
                mediaType: "image/png",
                url: IMAGE_URL,
                filename: "pixel.png",
              },
            ],
          },
        ]}
      />,
    );
    await expect
      .element(page.getByRole("img", { name: "pixel.png" }))
      .toBeVisible();
  });
  test("upload and validation errors retain the text draft and allow removing the failed image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(new Response("overloaded", { status: 503 })),
      ),
    );
    await render(
      <ChatView
        chatId={chatIdFixture()}
        initialMessages={[]}
        buddyName="Hippy"
      />,
    );
    const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
    await box.fill("What is this?");
    paste(imageFile());
    await expect
      .element(page.getByText(userMessage("overloaded")))
      .toBeVisible();
    await expect.element(box).toHaveValue("What is this?");
    await page.getByRole("button", { name: IMAGE_COPY.remove }).click();
    paste(new File(["<svg/>"], "drawing.svg", { type: "image/svg+xml" }));
    await expect
      .element(page.getByText(userMessage("invalid-image")))
      .toBeVisible();
    await expect.element(box).toHaveValue("What is this?");
  });
  test("file selection enforces count limits and a model failure can be retried without losing the next draft", async () => {
    let attempts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((input) => {
        if (String(input).startsWith("/api/images?")) {
          return Promise.resolve(Response.json({ url: IMAGE_URL }));
        }
        attempts += 1;
        if (attempts === 1) {
          return Promise.resolve(new Response("overloaded", { status: 503 }));
        }
        return Promise.resolve(reply());
      }),
    );
    const view = await render(
      <ChatView
        chatId={chatIdFixture()}
        initialMessages={[]}
        buddyName="Hippy"
      />,
    );
    const picker = view.container.querySelector("input");
    if (!(picker instanceof HTMLInputElement) || picker.type !== "file") {
      throw new Error("No image picker");
    }
    await userEvent.upload(picker, [
      imageFile(),
      imageFile(),
      imageFile(),
      imageFile(),
      imageFile(),
    ]);
    await expect
      .element(page.getByText(userMessage("invalid-image")))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: CHAT_COPY.send }))
      .toBeDisabled();
    // Remove the fifth image and three others, leaving one valid image.
    await page.getByRole("button", { name: IMAGE_COPY.remove }).last().click();
    await page.getByRole("button", { name: IMAGE_COPY.remove }).last().click();
    await page.getByRole("button", { name: IMAGE_COPY.remove }).last().click();
    await page.getByRole("button", { name: IMAGE_COPY.remove }).last().click();
    await page.getByRole("button", { name: CHAT_COPY.send }).click();
    await expect
      .element(page.getByText(userMessage("overloaded")))
      .toBeVisible();
    await expect
      .element(page.getByRole("img", { name: "pixel.png" }))
      .toBeVisible();
    const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
    await box.fill("My next question");
    await page.getByRole("button", { name: IMAGE_COPY.retry }).click();
    await expect.element(page.getByText(REPLY)).toBeVisible();
    await expect.element(box).toHaveValue("My next question");
    expect(attempts).toBe(2);
  });
  test("a quota refusal returns image and text to the composer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((input) => {
        if (String(input).startsWith("/api/images?")) {
          return Promise.resolve(Response.json({ url: IMAGE_URL }));
        }
        return Promise.resolve(new Response("quota-used-up", { status: 429 }));
      }),
    );
    await render(
      <ChatView
        chatId={chatIdFixture()}
        initialMessages={[]}
        buddyName="Hippy"
      />,
    );
    const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
    await box.fill("What is this?");
    paste(imageFile());
    await expect
      .element(page.getByRole("img", { name: "pixel.png" }))
      .toBeVisible();
    await page.getByRole("button", { name: CHAT_COPY.send }).click();
    await expect
      .element(page.getByText(userMessage("quota-used-up")))
      .toBeVisible();
    await expect.element(box).toHaveValue("What is this?");
    await expect
      .element(page.getByRole("img", { name: "pixel.png" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: IMAGE_COPY.remove }))
      .toBeVisible();
  });
});
